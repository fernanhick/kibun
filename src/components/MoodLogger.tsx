import React, { useRef, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import * as Crypto from 'expo-crypto';
import { Button } from '@components/Button';
import { MoodBubble } from '@components/MoodBubble';
import { MOODS, PRIMARY_MOODS, MoodDefinition, MoodGroup } from '@constants/moods';
import { typography, spacing, radius } from '@constants/theme';
import { useTheme, type ThemePalette } from '@theme/ThemeContext';
import { useThemedStyles } from '@hooks/useThemedStyles';
import { useResponsive } from '@hooks/useResponsive';
import { useMoodEntryStore, useSessionStore, useCustomMoodsStore } from '@store/index';
import { getCheckInSlot } from '@lib/checkInSlot';
import { analyseSentiment, getMoodSentimentAlignment } from '@lib/sentiment';
import { getMoodDef } from '@lib/moodUtils';
import { haptics } from '@lib/haptics';
import { safeParseDateString } from '@lib/safeDate';
import type { SentimentResult } from '@lib/sentiment';
import type { SentimentLabel } from '@models/index';

// When note tone strongly contradicts the selected mood, store/display neutral
// so the recap stays internally consistent.
function getMoodAwareSentimentLabel(
  moodGroup: MoodGroup,
  sentiment: SentimentResult,
  alignment: 'aligned' | 'contrary' | 'neutral'
): SentimentLabel {
  if (alignment === 'contrary' && moodGroup !== 'neutral') {
    return 'neutral';
  }
  return sentiment.label;
}

// Fixed size for bubbles in the expanded full list (~30% up from the old 46px).
const EXPANDED_BUBBLE_SIZE = 60;

interface MoodLoggerProps {
  /** ISO date string for back-dating; omit to log against now. */
  date?: string;
  /** `hero` renders for a coloured gradient (inverse text); `screen` for a plain surface. */
  variant?: 'hero' | 'screen';
  /** Called after the entry is persisted so the parent can navigate. */
  onLogged: (entryId: string, moodId: string) => void;
}

export function MoodLogger({ date, variant = 'screen', onLogged }: MoodLoggerProps) {
  const { colors } = useTheme();
  const styles = useThemedStyles(variant === 'hero' ? createHeroStyles : createScreenStyles);
  const { t } = useTranslation('screens');
  const router = useRouter();
  const session = useSessionStore((s) => s.session);
  const isPro = session?.subscriptionStatus === 'trial' || session?.subscriptionStatus === 'active';
  const customMoods = useCustomMoodsStore((s) => s.moods);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [expanded, setExpanded] = useState(false);

  // Sentiment runs in the background while typing so the entry carries a label
  // by save time; falls back to a synchronous run if the debounce hasn't fired.
  const sentimentRef = useRef<SentimentResult | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selectedMood = selectedId ? getMoodDef(selectedId, customMoods) : null;
  const accentColor = variant === 'hero' ? colors.textInverse : colors.pink;

  // Collapsed: size the primary bubbles to fill the row so the 6 are as large as
  // possible with no gaps, on any device. (screen padding 16×2; ~6px safety so
  // the border/rounding never forces a wrap.) Clamped for tablets/landscape.
  const { width: winWidth } = useResponsive();
  const fillSize = Math.min(Math.floor((winWidth - 38) / PRIMARY_MOODS.length), 84);

  // Collapsed shows the everyday subset; expanded reveals the full list and any
  // custom moods. A selected mood that lives outside the subset is appended so
  // it stays visible after collapsing.
  const visibleMoods: MoodDefinition[] = expanded ? MOODS : PRIMARY_MOODS;
  const showSelectedExtra =
    !expanded && selectedMood && !PRIMARY_MOODS.some((m) => m.id === selectedMood.id);

  const handleSelect = (mood: MoodDefinition) => {
    setSelectedId(mood.id);
  };

  const handleNoteChange = (text: string) => {
    setNote(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!text.trim()) {
      sentimentRef.current = null;
      return;
    }
    debounceRef.current = setTimeout(async () => {
      sentimentRef.current = await analyseSentiment(text);
    }, 600);
  };

  const handleSave = async () => {
    if (!selectedMood || submitting) return;
    setSubmitting(true);

    const trimmed = note.trim();
    let sentimentLabel: SentimentLabel | undefined;
    let sentimentScore: number | undefined;
    if (trimmed) {
      const result = sentimentRef.current ?? (await analyseSentiment(trimmed));
      if (result) {
        const alignment = getMoodSentimentAlignment(selectedMood.group, result);
        sentimentLabel = getMoodAwareSentimentLabel(selectedMood.group, result, alignment);
        sentimentScore = result.score;
      }
    }

    const entryId = Crypto.randomUUID();
    const entryDate = date ? safeParseDateString(date) : new Date();
    useMoodEntryStore.getState().addEntry({
      id: entryId,
      moodId: selectedMood.id,
      note: trimmed || null,
      slot: getCheckInSlot(entryDate),
      loggedAt: entryDate.toISOString(),
      sentimentLabel,
      sentimentScore,
    });
    haptics.success();
    onLogged(entryId, selectedMood.id);

    // Reset so returning to a still-mounted host (e.g. the home tab under the
    // pushed post-save screen) shows a clean logger rather than a stale pick.
    setSelectedId(null);
    setNote('');
    setExpanded(false);
    sentimentRef.current = null;
    setSubmitting(false);
  };

  const renderBubble = (mood: MoodDefinition) => (
    <MoodBubble
      key={mood.id}
      mood={mood}
      size={expanded ? 'xs' : 'smCompact'}
      sizeOverride={expanded ? EXPANDED_BUBBLE_SIZE : fillSize}
      selected={selectedId === mood.id}
      onPress={handleSelect}
      showGradient={false}
      labelColor={variant === 'hero' ? colors.textInverse : undefined}
    />
  );

  return (
    <View style={styles.wrap}>
      <View style={styles.grid}>
        {visibleMoods.map(renderBubble)}
        {showSelectedExtra && selectedMood && renderBubble(selectedMood)}
        {expanded &&
          isPro &&
          customMoods.map((cm) => {
            const def = getMoodDef(cm.id, customMoods);
            return def ? renderBubble(def) : null;
          })}
      </View>

      {/* See more / less + manage custom moods */}
      <View style={styles.footerRow}>
        <Pressable
          onPress={() => setExpanded((v) => !v)}
          hitSlop={8}
          accessibilityRole="button"
          style={styles.footerLink}
        >
          <Text style={[styles.footerLinkText, { color: accentColor }]}>
            {expanded ? t('checkIn.seeLess') : t('checkIn.seeMore')}
          </Text>
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={14}
            color={accentColor}
          />
        </Pressable>

        {isPro && (
          <Pressable
            onPress={() => router.push('/custom-moods' as Href)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={t('checkIn.a11yManageCustom')}
            style={styles.footerLink}
          >
            <Ionicons name="add-circle-outline" size={15} color={accentColor} />
            <Text style={[styles.footerLinkText, { color: accentColor }]}>
              {t('checkIn.manageMoods')}
            </Text>
          </Pressable>
        )}
      </View>

      {/* Progressive disclosure: note + Save appear only once a mood is picked. */}
      {selectedMood && (
        <View style={styles.reveal}>
          <TextInput
            style={styles.noteInput}
            value={note}
            onChangeText={handleNoteChange}
            placeholder={t('moodConfirm.notePlaceholder')}
            placeholderTextColor={variant === 'hero' ? colors.sparkle : colors.textDisabled}
            multiline
            numberOfLines={2}
            textAlignVertical="top"
            accessibilityLabel={t('moodConfirm.noteA11y')}
          />
          <Button
            label={t('moodConfirm.save')}
            onPress={handleSave}
            variant="sunrise"
            loading={submitting}
            disabled={submitting}
            fullWidth
          />
        </View>
      )}
    </View>
  );
}

const sharedStyles = {
  wrap: {
    gap: spacing.sm,
  },
  grid: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    justifyContent: 'center' as const,
    alignItems: 'flex-start' as const,
    rowGap: spacing.xs,
  },
  footerRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: spacing.lg,
  },
  footerLink: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
    paddingVertical: spacing.xs,
  },
  footerLinkText: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.ui,
  },
  reveal: {
    gap: spacing.sm,
    paddingTop: spacing.xs,
    paddingHorizontal: spacing.md,
  },
};

const createScreenStyles = (colors: ThemePalette) => StyleSheet.create({
  ...sharedStyles,
  noteInput: {
    borderWidth: 1.5,
    borderColor: colors.pinkBorder,
    borderRadius: radius.lg,
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    fontSize: typography.sizes.md,
    color: colors.text,
    backgroundColor: colors.pinkLight,
    minHeight: 64,
    maxHeight: 96,
  },
});

const createHeroStyles = (colors: ThemePalette) => StyleSheet.create({
  ...sharedStyles,
  noteInput: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
    borderRadius: radius.lg,
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    fontSize: typography.sizes.md,
    color: colors.textInverse,
    backgroundColor: 'rgba(255,255,255,0.18)',
    minHeight: 56,
    maxHeight: 96,
  },
});

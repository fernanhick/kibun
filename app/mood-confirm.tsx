import { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter, useLocalSearchParams, type Href } from 'expo-router';
import { useTranslation } from 'react-i18next';
import * as Crypto from 'expo-crypto';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Screen, Button } from '@components/index';
import { MoodBubble } from '@components/MoodBubble';
import { SparkleOverlay } from '@components/SparkleOverlay';
import { MoodGroup } from '@constants/moods';
import { colors, typography, spacing, radius } from '@constants/theme';
import { useMoodEntryStore, useSessionStore, useCustomMoodsStore } from '@store/index';
import { getCheckInSlot } from '@lib/checkInSlot';
import { analyseSentiment, getMoodSentimentAlignment } from '@lib/sentiment';
import { getMoodDef } from '@lib/moodUtils';
import { safeParseDateString, safeParseIsoDate } from '@lib/safeDate';
import { supabase } from '@lib/supabase';
import i18n from '@i18n/index';
import { formatDate } from '@i18n/dateFormat';
import type { SentimentResult } from '@lib/sentiment';
import type { SentimentLabel } from '@models/index';

function formatBackdate(d: string) {
  const date = safeParseDateString(d);
  return formatDate(date, { month: 'long', day: 'numeric' });
}

// Sentiment chip styling — labels resolved via i18n at render time.
const SENTIMENT_STYLE: Record<SentimentLabel, { emoji: string; color: string }> = {
  positive: { emoji: '😊', color: colors.success },
  neutral:  { emoji: '😐', color: colors.textSecondary },
  negative: { emoji: '😔', color: colors.error },
};

function getMoodAwareSentimentLabel(
  moodGroup: MoodGroup,
  sentiment: SentimentResult,
  alignment: 'aligned' | 'contrary' | 'neutral'
): SentimentLabel {
  // When note tone strongly contradicts selected mood, keep UX consistent by storing/displaying neutral.
  if (alignment === 'contrary' && moodGroup !== 'neutral') {
    return 'neutral';
  }
  return sentiment.label;
}

// ─── Mood-specific exercise suggestions (Pro feature) ─────────────────────────
// Visual styling per mood group. title/subtitle and option labels resolved via
// i18n in-component; option types stay as ids for routing.
interface MoodExerciseStyle {
  borderColor: string;
  chipBg: string;
  chipBorder: string;
  optionTypes: { type: string; emoji: string }[];
}

const MOOD_EXERCISE_STYLE: Record<MoodGroup, MoodExerciseStyle> = {
  green: {
    borderColor: '#A5D6A7',
    chipBg: '#E8F5E9',
    chipBorder: '#81C784',
    optionTypes: [
      { type: 'gratitude',      emoji: '🙏' },
      { type: 'joy_capture',    emoji: '✨' },
      { type: 'savoring',       emoji: '🌸' },
    ],
  },
  neutral: {
    borderColor: '#CFD8DC',
    chipBg: '#ECEFF1',
    chipBorder: '#B0BEC5',
    optionTypes: [
      { type: 'energy_boost',   emoji: '⚡' },
      { type: 'curiosity',      emoji: '🔍' },
      { type: 'mindful_pause',  emoji: '🧘' },
    ],
  },
  'red-orange': {
    borderColor: '#FFD8B0',
    chipBg: '#FFF3E0',
    chipBorder: '#FFCC80',
    optionTypes: [
      { type: 'box_breathing',  emoji: '🫁' },
      { type: 'grounding',      emoji: '🌱' },
      { type: 'body_scan',      emoji: '🫀' },
    ],
  },
  blue: {
    borderColor: '#90CAF9',
    chipBg: '#E3F2FD',
    chipBorder: '#64B5F6',
    optionTypes: [
      { type: 'self_compassion', emoji: '💜' },
      { type: 'comfort_list',    emoji: '🧸' },
      { type: 'box_breathing',   emoji: '🫁' },
    ],
  },
};

export default function MoodConfirmScreen() {
  const router = useRouter();
  const { t } = useTranslation('screens');
  const params = useLocalSearchParams<{ moodId: string; date?: string }>();
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sentiment, setSentiment] = useState<SentimentResult | null>(null);
  const [energyLevel, setEnergyLevel] = useState<number | null>(null);
  const [focusLevel, setFocusLevel] = useState<number | null>(null);

  const session = useSessionStore((s) => s.session);
  const isPro = session?.subscriptionStatus === 'trial' || session?.subscriptionStatus === 'active';
  const customMoods = useCustomMoodsStore((s) => s.moods);

  // Debounce sentiment analysis: run 600 ms after user stops typing
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const mood = getMoodDef(params.moodId, customMoods);

  // Guard against invalid/missing moodId — defer to effect so we don't
  // call router.back() during render (React warns about scheduling updates
  // on another component while rendering).
  useEffect(() => {
    if (!mood) router.back();
  }, [mood, router]);

  if (!mood) return null;

  // Run ONNX sentiment inference 600 ms after the user stops typing.
  // Clears the chip immediately when the note is deleted.
  const handleNoteChange = (text: string) => {
    setNote(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!text.trim()) {
      setSentiment(null);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      const result = await analyseSentiment(text);
      setSentiment(result);
    }, 600);
  };

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const alignment = sentiment
    ? getMoodSentimentAlignment(mood.group, sentiment)
    : 'neutral';

  const moodAwareSentimentLabel = sentiment
    ? getMoodAwareSentimentLabel(mood.group, sentiment, alignment)
    : null;

  const handleSave = async () => {
    if (submitting) return;
    setSubmitting(true);

    const entryId = Crypto.randomUUID();
    const entryDate = params.date 
      ? safeParseDateString(params.date) 
      : new Date();
    const entry = {
      id: entryId,
      moodId: mood.id,
      note: note.trim() || null,
      slot: getCheckInSlot(entryDate),
      loggedAt: entryDate.toISOString(),
      sentimentLabel: moodAwareSentimentLabel ?? undefined,
      sentimentScore: sentiment?.score,
      energyLevel: isPro && energyLevel !== null ? energyLevel : undefined,
      focusLevel: isPro && focusLevel !== null ? focusLevel : undefined,
    };

    useMoodEntryStore.getState().addEntry(entry);

    // Pro: fetch a journal reflection prompt then navigate to journal screen
    if (isPro && supabase) {
      try {
        const recent = useMoodEntryStore.getState().entries.slice(0, 5);
        const { data } = await supabase.functions.invoke('generate-journal-prompt', {
          body: {
            mood_id:       mood.id,
            mood_label:    mood.label,
            mood_group:    mood.group,
            recent_entries: recent.map((e) => ({
              mood:       e.moodId,
              slot:       e.slot,
              logged_at:  e.loggedAt,
              note:       e.note ?? undefined,
            })),
            language: i18n.language,
          },
        });
        if (data?.prompt) {
          router.replace({
            pathname: '/journal-reflect',
            params: { entryId, prompt: data.prompt, moodId: mood.id },
          } as unknown as Href);
          return;
        }
      } catch {
        // silently fall through to default navigation
      }
    }

    router.replace('/(tabs)');
  };

  return (
    <Screen scrollable={true} contentContainerStyle={styles.content}>
      <LinearGradient
        colors={[colors.pink, colors.pinkEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroCard}
      >
        <SparkleOverlay count={20} />
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }} />
          <Pressable
            onPress={() => router.replace('/(tabs)')}
            accessibilityRole="button"
            accessibilityLabel={t('moodConfirm.closeA11y')}
            hitSlop={12}
          >
            <Ionicons name="close" size={22} color={colors.textInverse} />
          </Pressable>
        </View>
        <View style={styles.moodDisplay}>
          <MoodBubble mood={mood} size="xl" showLabel={false} showGradient={false} />
          <View style={styles.titleColumn}>
            <Text style={styles.moodLabel}>{mood.label}</Text>
            <Text style={styles.moodSubLabel}>{t('moodConfirm.moodSubLabel')}</Text>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.noteSection}>
        <Text style={styles.noteLabel}>{t('moodConfirm.noteLabel')}</Text>
        <TextInput
          style={styles.noteInput}
          value={note}
          onChangeText={handleNoteChange}
          placeholder={t('moodConfirm.notePlaceholder')}
          placeholderTextColor={colors.textDisabled}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          accessibilityLabel={t('moodConfirm.noteA11y')}
        />
        {/* Sentiment chip — only shown when ONNX model is available + note is long enough */}
        {sentiment && (() => {
          const sentimentKey = moodAwareSentimentLabel ?? 'neutral';
          const sStyle = SENTIMENT_STYLE[sentimentKey];
          return (
            <View style={styles.sentimentRow}>
              <View style={[styles.sentimentChip, { borderColor: sStyle.color }]}>
                <Text style={styles.sentimentEmoji}>{sStyle.emoji}</Text>
                <Text style={[styles.sentimentLabel, { color: sStyle.color }]}>
                  {t(`moodConfirm.sentiment.${sentimentKey}`)}
                </Text>
              </View>
              {/* Gentle contradiction hint */}
              {alignment === 'contrary' && (
                <Text style={styles.alignmentHint}>
                  {mood.group === 'green'
                    ? t('moodConfirm.alignmentHintGreen')
                    : t('moodConfirm.alignmentHintNegative')}
                </Text>
              )}
            </View>
          );
        })()}
      </View>

      {/* Energy & Focus — Pro feature */}
      {isPro ? (
        <View style={styles.efCard}>
          <Text style={styles.efTitle}>{t('moodConfirm.energy.title')}</Text>
          <Text style={styles.efSubtitle}>{t('moodConfirm.energy.subtitle')}</Text>
          <DotPicker
            label={t('moodConfirm.energy.energy')}
            emoji="⚡"
            value={energyLevel}
            onChange={setEnergyLevel}
            activeColor={colors.accent}
          />
          <DotPicker
            label={t('moodConfirm.energy.focus')}
            emoji="🎯"
            value={focusLevel}
            onChange={setFocusLevel}
            activeColor={colors.primary}
          />
        </View>
      ) : (
        <TouchableOpacity
          style={styles.efTeaser}
          onPress={() => router.push('/paywall' as Href)}
          accessibilityRole="button"
          accessibilityLabel={t('moodConfirm.energyTeaserA11y')}
        >
          <Ionicons name="sparkles" size={13} color={colors.primary} />
          <Text style={styles.efTeaserText}>{t('moodConfirm.energyTeaser')}</Text>
          <View style={styles.efProBadge}>
            <Text style={styles.efProBadgeText}>{t('moodConfirm.proBadge')}</Text>
          </View>
        </TouchableOpacity>
      )}

      <View style={styles.actions}>
        {/* Exercise CTA — visible to all, functional for Pro only */}
        {(() => {
          const style = MOOD_EXERCISE_STYLE[mood.group];
          return (
            <View style={[styles.exerciseCard, { borderColor: style.borderColor }]}>
              <View style={styles.exerciseTitleRow}>
                <Text style={styles.exerciseTitle}>{t(`moodConfirm.exercises.${mood.group}.title`)}</Text>
                {!isPro && (
                  <View style={styles.proBadge}>
                    <Ionicons name="lock-closed" size={10} color="#fff" />
                    <Text style={styles.proBadgeText}>{t('moodConfirm.proBadge')}</Text>
                  </View>
                )}
              </View>
              <Text style={styles.exerciseSubtitle}>{t(`moodConfirm.exercises.${mood.group}.subtitle`)}</Text>
              <View style={[styles.exerciseRow, !isPro && { opacity: 0.5 }]}>
                {style.optionTypes.map((opt) => {
                  const optLabel = t(`moodConfirm.exercises.options.${opt.type}`);
                  return (
                    <TouchableOpacity
                      key={opt.type}
                      style={[styles.exerciseChip, { backgroundColor: style.chipBg, borderColor: style.chipBorder }]}
                      onPress={() => {
                        if (isPro) {
                          router.push({ pathname: '/exercise', params: { type: opt.type } } as unknown as Href);
                        } else {
                          router.push('/paywall' as Href);
                        }
                      }}
                      accessibilityLabel={isPro ? optLabel : t('moodConfirm.exercises.requiresPro', { label: optLabel })}
                    >
                      <Text style={styles.exerciseEmoji}>{opt.emoji}</Text>
                      <Text style={styles.exerciseChipLabel}>{optLabel}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              {!isPro && (
                <TouchableOpacity
                  style={styles.unlockButton}
                  onPress={() => router.push('/paywall' as Href)}
                  accessibilityLabel={t('moodConfirm.exercises.unlockProA11y')}
                >
                  <Ionicons name="sparkles" size={14} color="#fff" />
                  <Text style={styles.unlockButtonText}>{t('moodConfirm.exercises.unlockPro')}</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })()}
        <Button
          label={t('moodConfirm.save')}
          onPress={handleSave}
          variant="sunrise"
          loading={submitting}
          disabled={submitting}
          fullWidth
        />
        <Button
          label={t('moodConfirm.changeMood')}
          onPress={() => router.back()}
          variant="ghost"
          fullWidth
        />
      </View>
    </Screen>
  );
}

// ─── Dot Picker ──────────────────────────────────────────────────────────────

function DotPicker({
  label,
  emoji,
  value,
  onChange,
  activeColor,
}: {
  label: string;
  emoji: string;
  value: number | null;
  onChange: (v: number | null) => void;
  activeColor: string;
}) {
  return (
    <View style={dotStyles.row}>
      <View style={dotStyles.labelGroup}>
        <Text style={dotStyles.emoji}>{emoji}</Text>
        <Text style={dotStyles.label}>{label}</Text>
      </View>
      <View style={dotStyles.dots}>
        {[1, 2, 3, 4, 5].map((n) => (
          <TouchableOpacity
            key={n}
            onPress={() => onChange(n)}
            accessibilityLabel={`${label} level ${n}`}
            accessibilityRole="button"
            accessibilityState={{ selected: value === n }}
            style={[
              dotStyles.dot,
              value !== null && n <= value
                ? { backgroundColor: activeColor, borderColor: activeColor }
                : undefined,
            ]}
          >
            {value !== null && n <= value ? null : (
              <Text style={dotStyles.dotEmpty} />
            )}
          </TouchableOpacity>
        ))}
      </View>
      {value !== null && (
        <TouchableOpacity onPress={() => onChange(null)} hitSlop={8} accessibilityLabel={`Clear ${label}`}>
          <Ionicons name="close-circle-outline" size={16} color={colors.textSecondary} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const dotStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  labelGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    width: 80,
  },
  emoji: {
    fontSize: 14,
  },
  label: {
    fontSize: typography.sizes.sm,
    color: colors.text,
    fontFamily: typography.fonts.ui,
  },
  dots: {
    flexDirection: 'row',
    gap: 8,
    flex: 1,
  },
  dot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#C8DCFF',
    backgroundColor: '#F0F7FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotEmpty: {},
});

const cardShadow = {
  shadowColor: '#000000',
  shadowOpacity: 0.4,
  shadowRadius: 1,
  shadowOffset: { width: 0, height: 1 },
  elevation: 6,
};

const heroShadow = {
  shadowColor: '#000000',
  shadowOpacity: 0.46,
  shadowRadius: 1,
  shadowOffset: { width: 0, height: 1 },
  elevation: 7,
};

const styles = StyleSheet.create({
  content: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroCard: {
    ...heroShadow,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    gap: 4,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  heroBadgeText: {
    color: colors.textInverse,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  moodDisplay: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  titleColumn: {
    flex: 1,
    marginLeft: spacing.sm,
    gap: spacing.xs,
  },
  moodLabel: {
    fontSize: typography.sizes.xxl,
    fontFamily: typography.fonts.display,
    color: colors.textInverse,
  },
  moodSubLabel: {
    fontSize: typography.sizes.sm,
    color: colors.sparkle,
    lineHeight: 20,
  },
  shibaContainer: {
    alignItems: 'center',
  },
  noteSection: {
    ...cardShadow,
    gap: spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderRadius: 22,
    padding: spacing.md,
    borderWidth: 1.5,
    borderColor: '#BFCDE2',
  },
  noteLabel: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.ui,
    color: colors.pink,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  noteInput: {
    borderWidth: 1.5,
    borderColor: colors.pinkBorder,
    borderRadius: radius.lg,
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    fontSize: typography.sizes.md,
    color: colors.text,
    backgroundColor: colors.pinkLight,
    minHeight: 100,
  },
  actions: {
    gap: spacing.md,
  },
  exerciseCard: {
    ...cardShadow,
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1.5,
    padding: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  exerciseTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  exerciseTitle: {
    fontSize: typography.sizes.md,
    fontFamily: typography.fonts.ui,
    color: colors.text,
  },
  proBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.pink,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  proBadgeText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    color: '#fff',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  unlockButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.pink,
    borderRadius: radius.lg,
    paddingVertical: 10,
    marginTop: spacing.xs,
  },
  unlockButtonText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: '#fff',
  },
  exerciseSubtitle: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
  },
  exerciseRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  exerciseChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: radius.lg,
    paddingVertical: 8,
    paddingHorizontal: spacing.sm,
  },
  exerciseEmoji: {
    fontSize: 16,
  },
  exerciseChipLabel: {
    fontSize: typography.sizes.sm,
    color: colors.text,
    fontFamily: typography.fonts.ui,
  },
  sentimentRow: {
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  sentimentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    borderWidth: 1,
    borderRadius: radius.full ?? 999,
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.surface,
  },
  sentimentEmoji: {
    fontSize: 14,
  },
  sentimentLabel: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
  },
  alignmentHint: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  efCard: {
    ...cardShadow,
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderRadius: 22,
    padding: spacing.md,
    borderWidth: 1.5,
    borderColor: '#BFCDE2',
    gap: spacing.md,
  },
  efTitle: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.ui,
    color: colors.pink,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  efSubtitle: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    marginTop: -spacing.xs,
  },
  efTeaser: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: colors.pinkLight,
    borderWidth: 1,
    borderColor: colors.pinkBorder,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    marginTop: spacing.xs,
  },
  efTeaserText: {
    fontSize: typography.sizes.sm,
    color: colors.pink,
  },
  efProBadge: {
    backgroundColor: colors.pink,
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  efProBadgeText: {
    fontSize: 9,
    color: '#fff',
    fontWeight: typography.weights.semibold,
  },
});

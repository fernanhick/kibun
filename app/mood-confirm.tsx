import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter, useLocalSearchParams, type Href } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Screen, Button } from '@components/index';
import { MoodBubble } from '@components/MoodBubble';
import { SparkleOverlay } from '@components/SparkleOverlay';
import { MoodGroup } from '@constants/moods';
import { EXERCISE_CHIP_IMAGES, type ExerciseType } from '@constants/exercises';
import { typography, spacing, radius } from '@constants/theme';
import { useTheme, type ThemePalette } from '@theme/ThemeContext';
import { useThemedStyles } from '@hooks/useThemedStyles';
import { useMoodEntryStore, useSessionStore, useCustomMoodsStore } from '@store/index';
import { getMoodDef } from '@lib/moodUtils';
import { supabase } from '@lib/supabase';
import i18n from '@i18n/index';

// ─── Mood-specific exercise suggestions (Pro feature) ─────────────────────────
interface MoodExerciseStyle {
  borderColor: string;
  chipBg: string;
  chipBorder: string;
  optionTypes: { type: ExerciseType }[];
}

const getMoodExerciseStyle = (colors: ThemePalette): Record<MoodGroup, MoodExerciseStyle> => ({
  green: {
    borderColor: colors.successBorder,
    chipBg: colors.successLight,
    chipBorder: colors.successBorder,
    optionTypes: [
      { type: 'gratitude' },
      { type: 'joy_capture' },
      { type: 'savoring' },
    ],
  },
  neutral: {
    borderColor: colors.border,
    chipBg: colors.borderLight,
    chipBorder: colors.border,
    optionTypes: [
      { type: 'energy_boost' },
      { type: 'curiosity' },
      { type: 'mindful_pause' },
    ],
  },
  'red-orange': {
    borderColor: colors.warningBorder,
    chipBg: colors.warningLight,
    chipBorder: colors.warningBorder,
    optionTypes: [
      { type: 'box_breathing' },
      { type: 'grounding' },
      { type: 'body_scan' },
    ],
  },
  blue: {
    borderColor: colors.chipBorder,
    chipBg: colors.primaryLight,
    chipBorder: colors.chipBorder,
    optionTypes: [
      { type: 'self_compassion' },
      { type: 'comfort_list' },
      { type: 'box_breathing' },
    ],
  },
});

export default function MoodPostSaveScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const { t } = useTranslation('screens');
  const params = useLocalSearchParams<{ entryId: string; moodId: string; date?: string }>();
  const [energyLevel, setEnergyLevel] = useState<number | null>(null);
  const [focusLevel, setFocusLevel] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  const session = useSessionStore((s) => s.session);
  const isPro = session?.subscriptionStatus === 'trial' || session?.subscriptionStatus === 'active';
  const customMoods = useCustomMoodsStore((s) => s.moods);

  const mood = getMoodDef(params.moodId, customMoods);

  // Guard against a missing/invalid entry (e.g. deep-linked directly).
  useEffect(() => {
    if (!mood || !params.entryId) router.replace('/(tabs)');
  }, [mood, params.entryId, router]);

  if (!mood || !params.entryId) return null;

  const handleEnergyChange = (value: number | null) => {
    setEnergyLevel(value);
    useMoodEntryStore.getState().updateEntryMetrics(params.entryId, { energyLevel: value });
  };

  const handleFocusChange = (value: number | null) => {
    setFocusLevel(value);
    useMoodEntryStore.getState().updateEntryMetrics(params.entryId, { focusLevel: value });
  };

  const goHome = () => router.replace('/(tabs)');

  // Pro: fetch a journal reflection prompt then open the journal screen.
  const handleReflect = async () => {
    if (busy) return;
    setBusy(true);
    if (supabase) {
      try {
        const recent = useMoodEntryStore.getState().entries.slice(0, 5);
        const { data } = await supabase.functions.invoke('generate-journal-prompt', {
          body: {
            mood_id: mood.id,
            mood_label: mood.label,
            mood_group: mood.group,
            recent_entries: recent.map((e) => ({
              mood: e.moodId,
              slot: e.slot,
              logged_at: e.loggedAt,
              note: e.note ?? undefined,
            })),
            language: i18n.language,
          },
        });
        if (data?.prompt) {
          router.replace({
            pathname: '/journal-reflect',
            params: { entryId: params.entryId, prompt: data.prompt, moodId: mood.id },
          } as unknown as Href);
          return;
        }
      } catch {
        // fall through to home on any failure
      }
    }
    goHome();
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
          <View style={styles.savedBadge}>
            <Ionicons name="checkmark-circle" size={14} color={colors.textInverse} />
            <Text style={styles.savedBadgeText}>{t('moodConfirm.savedTitle')}</Text>
          </View>
          <Pressable
            onPress={goHome}
            accessibilityRole="button"
            accessibilityLabel={t('moodConfirm.done')}
            hitSlop={12}
          >
            <Ionicons name="close" size={22} color={colors.textInverse} />
          </Pressable>
        </View>
        <View style={styles.moodDisplay}>
          <MoodBubble mood={mood} size="xl" showLabel={false} showGradient={false} />
          <View style={styles.titleColumn}>
            <Text style={styles.moodLabel}>{mood.label}</Text>
            <Text style={styles.moodSubLabel}>{t('moodConfirm.savedSubtitle')}</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Energy & Focus — Pro feature */}
      {isPro ? (
        <View style={styles.efCard}>
          <Text style={styles.efTitle}>{t('moodConfirm.energy.title')}</Text>
          <Text style={styles.efSubtitle}>{t('moodConfirm.energy.subtitle')}</Text>
          <DotPicker
            label={t('moodConfirm.energy.energy')}
            icon="flash"
            value={energyLevel}
            onChange={handleEnergyChange}
            activeColor={colors.accent}
          />
          <DotPicker
            label={t('moodConfirm.energy.focus')}
            icon="locate"
            value={focusLevel}
            onChange={handleFocusChange}
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
          const style = getMoodExerciseStyle(colors)[mood.group];
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
                      <Image
                        source={EXERCISE_CHIP_IMAGES[opt.type]}
                        style={{ width: 28, height: 28, marginRight: 4 }}
                        accessibilityIgnoresInvertColors
                      />
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

        {isPro ? (
          <>
            <Button
              label={t('moodConfirm.reflect')}
              onPress={handleReflect}
              variant="sunrise"
              loading={busy}
              disabled={busy}
              fullWidth
            />
            <Button
              label={t('moodConfirm.done')}
              onPress={goHome}
              variant="ghost"
              fullWidth
            />
          </>
        ) : (
          <Button
            label={t('moodConfirm.done')}
            onPress={goHome}
            variant="sunrise"
            fullWidth
          />
        )}
      </View>
    </Screen>
  );
}

// ─── Dot Picker ──────────────────────────────────────────────────────────────

function DotPicker({
  label,
  icon,
  value,
  onChange,
  activeColor,
}: {
  label: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  value: number | null;
  onChange: (v: number | null) => void;
  activeColor: string;
}) {
  const { colors } = useTheme();
  const dotStyles = useThemedStyles(createDotStyles);
  return (
    <View style={dotStyles.row}>
      <View style={dotStyles.labelGroup}>
        <Ionicons name={icon} size={16} color={colors.textSecondary} />
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

const createDotStyles = (colors: ThemePalette) => StyleSheet.create({
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
    borderColor: colors.border,
    backgroundColor: colors.primaryLight,
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

const createStyles = (colors: ThemePalette) => StyleSheet.create({
  content: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  savedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
  },
  savedBadgeText: {
    color: colors.textInverse,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  heroCard: {
    ...heroShadow,
    borderRadius: radius.xxl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    gap: 4,
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
  actions: {
    gap: spacing.md,
  },
  exerciseCard: {
    ...cardShadow,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
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
  exerciseChipLabel: {
    fontSize: typography.sizes.sm,
    color: colors.text,
    fontFamily: typography.fonts.ui,
  },
  efCard: {
    ...cardShadow,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.card,
    padding: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.border,
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

import { useMemo, useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, ActivityIndicator, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, Href } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSessionStore, useMoodEntryStore, useDailyInsightStore } from '@store/index';
import { useUiPrefsStore } from '@store/uiPrefsStore';
import { useOnboardingStore } from '@store/onboardingStore';
import { useHabitsStore } from '@store/habitsStore';
import { useNotificationPrefsStore } from '@store/notificationPrefsStore';
import { useCustomMoodsStore } from '@store/customMoodsStore';
import { Card, HabitIcon, InsightCard, MoodBubble, MoodLogger, Screen } from '@components/index';
import { SparkleOverlay } from '@components/SparkleOverlay';
import { SpringPressable } from '@components/SpringPressable';
import { MOOD_MAP, type MoodId } from '@constants/moods';
import { getMoodDef } from '@lib/moodUtils';
import { spacing, typography, radius, shadows } from '@constants/theme';
import { useTheme, type ThemePalette } from '@theme/ThemeContext';
import { useThemedStyles } from '@hooks/useThemedStyles';
import { INSIGHT_CARD_IMAGES } from '@lib/achievements';
import { fetchDailyInsight } from '@lib/dailyInsight';
import {
  generateLowMoodNudgeInsight,
  generatePositiveCorrelationInsight,
} from '@lib/correlationInsights';
import { computeAdaptiveTimes } from '@lib/notifications';
import { getMoodLabel } from '@lib/moodLabels';
import { formatTime as formatLocaleTime } from '@i18n/dateFormat';
import { useResponsive } from '@hooks/useResponsive';
import { useScreenScroll } from '@hooks/useScreenScroll';
import type { Habit, HabitLog } from '@models/index';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function formatTime(isoString: string): string {
  return formatLocaleTime(new Date(isoString), { hour: '2-digit', minute: '2-digit' });
}

type MoodSentiment = 'positive' | 'struggling' | 'neutral';

interface EmptyStateVariant {
  imageKey: string;
  title: string;
  body: string;
  affirmation: string;
}

function dayHash(dateStr: string): number {
  let h = 0;
  for (let i = 0; i < dateStr.length; i++) h = (h * 31 + dateStr.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function getMoodSentiment(recentEntries: Array<{ moodId: string }>): MoodSentiment {
  if (recentEntries.length === 0) return 'neutral';
  const groups = recentEntries.map((e) => MOOD_MAP[e.moodId as MoodId]?.group ?? 'neutral');
  let positive = 0, struggling = 0;
  for (const g of groups) {
    if (g === 'green') positive++;
    else if (g === 'red-orange' || g === 'blue') struggling++;
  }
  const total = groups.length;
  if (positive / total >= 0.6) return 'positive';
  if (struggling / total >= 0.5) return 'struggling';
  return 'neutral';
}

export default function HomeScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const { t, i18n } = useTranslation('screens');
  const insets = useSafeAreaInsets();
  const responsive = useResponsive();
  const { onScroll } = useScreenScroll();

  const getGreeting = (): string => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour <= 11) return t('home.greeting.morning');
    if (hour >= 12 && hour <= 16) return t('home.greeting.afternoon');
    if (hour >= 17 && hour <= 20) return t('home.greeting.evening');
    return t('home.greeting.windDown');
  };
  const emptySizes = {
    title: responsive.select({ phone: 24, phoneWide: 26, tablet: 30, tabletLg: 34 }),
    body: responsive.select({ phone: 17, phoneWide: 18, tablet: 20, tabletLg: 22 }),
    bodyLine: responsive.select({ phone: 24, phoneWide: 26, tablet: 28, tabletLg: 32 }),
    tipTitle: responsive.select({ phone: 17, phoneWide: 18, tablet: 20, tabletLg: 22 }),
    tipSub: responsive.select({ phone: 14, phoneWide: 15, tablet: 16, tabletLg: 18 }),
    tipSubLine: responsive.select({ phone: 20, phoneWide: 22, tablet: 24, tabletLg: 26 }),
    affirmation: responsive.select({ phone: 14, phoneWide: 15, tablet: 16, tabletLg: 18 }),
    illustration: responsive.select({ phone: 64, phoneWide: 68, tablet: 80, tabletLg: 92 }),
    badgeSize: responsive.select({ phone: 40, phoneWide: 42, tablet: 48, tabletLg: 54 }),
    iconSize: responsive.select({ phone: 22, phoneWide: 24, tablet: 26, tabletLg: 30 }),
    chevronSize: responsive.select({ phone: 16, tablet: 18, tabletLg: 20 }),
    rowPadV: responsive.select({ phone: 14, tablet: 16, tabletLg: 18 }),
    rowPadH: responsive.select({ phone: 14, tablet: 16, tabletLg: 18 }),
  };
  const { session } = useSessionStore();
  const isAnonymous = !session || session.authStatus === 'anonymous';
  const bannerDismissedAt = useUiPrefsStore((s) => s.bannerDismissedAt);
  const dismissBanner = useUiPrefsStore((s) => s.dismissBanner);
  const showBanner = isAnonymous && (bannerDismissedAt === null || Date.now() - bannerDismissedAt > SEVEN_DAYS_MS);
  const today = new Date().toISOString().split('T')[0];

  // Stable random seed per mount — message changes each time the screen opens.
  const [msgSeed] = useState(() => Math.floor(Math.random() * 10000));

  // Select stable reference (entries array), derive outside selector to avoid
  // infinite loop: .filter() creates a new array each call, breaking useSyncExternalStore.
  const entries = useMoodEntryStore((s) => s.entries);
  const customMoods = useCustomMoodsStore((s) => s.moods);

  const todayEntries = useMemo(
    () => entries.filter((e) => e.loggedAt.startsWith(today)),
    [entries, today]
  );

  const motivationalMessage = useMemo(() => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    const recentEntries = entries.filter(
      (e) => e.loggedAt.startsWith(yesterdayStr) || e.loggedAt.startsWith(today)
    );
    const sentiment = getMoodSentiment(recentEntries);
    const pool = t(`home.motivational.${sentiment}`, { returnObjects: true }) as string[];
    return pool[msgSeed % pool.length];
  }, [entries, today, msgSeed, t]);

  const emptyVariant = useMemo<EmptyStateVariant>(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 3);
    const cutoffIso = cutoff.toISOString();
    const recent = entries.filter(
      (e) => e.loggedAt >= cutoffIso && !e.loggedAt.startsWith(today)
    );
    const sentiment = getMoodSentiment(recent);
    const pool = t(`home.emptyVariants.${sentiment}`, { returnObjects: true }) as EmptyStateVariant[];
    return pool[dayHash(today) % pool.length];
  }, [entries, today, t]);

  const streak = useMemo(() => {
    if (entries.length === 0) return 0;
    const daysWithEntries = new Set(entries.map((e) => e.loggedAt.split('T')[0]));
    let count = 0;
    const d = new Date();
    while (true) {
      const dateStr = d.toISOString().split('T')[0];
      if (!daysWithEntries.has(dateStr)) break;
      count++;
      d.setDate(d.getDate() - 1);
    }
    return count;
  }, [entries]);

  const isPro = session?.subscriptionStatus === 'trial' || session?.subscriptionStatus === 'active';
  const profile = useOnboardingStore((s) => s.profile);
  const insightContent = useDailyInsightStore((s) => s.insight);
  const insightLoading = useDailyInsightStore((s) => s.isLoading);
  const insightHydrated = useDailyInsightStore((s) => s._hasHydrated);
  const setInsight = useDailyInsightStore((s) => s.setInsight);
  const setInsightLoading = useDailyInsightStore((s) => s.setLoading);

  useEffect(() => {
    if (!isPro || isAnonymous || !insightHydrated) return;

    const todayEntries14d = entries.filter((e) => {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 14);
      return e.loggedAt >= cutoff.toISOString();
    });
    if (todayEntries14d.length < 3) return;

    // The insight body is model-generated in the user's language, so a cached
    // one only counts as fresh if the language still matches. Entries stored
    // before 2026-08-31 carry no language and re-fetch once.
    if (insightContent?.date === today && insightContent.language === i18n.language) return;

    setInsightLoading(true);
    fetchDailyInsight({ profile }).then((text) => {
      if (text) setInsight(today, i18n.language, text);
      setInsightLoading(false);
    });
  }, [isPro, isAnonymous, insightHydrated, today, i18n.language]);

  // Compute adaptive notification times from mood entry history (Pro only)
  useEffect(() => {
    if (!isPro || entries.length < 7) return;
    const times = computeAdaptiveTimes(entries);
    if (Object.keys(times).length > 0) {
      useNotificationPrefsStore.getState().setAdaptiveTimes(times);
    }
  }, [isPro, entries]);

  const habits = useHabitsStore((s) => s.habits);
  const allHabitLogs = useHabitsStore((s) => s.logs);
  const logHabit = useHabitsStore((s) => s.logHabit);
  const clearHabitLog = useHabitsStore((s) => s.clearHabitLog);
  const todayHabitLogs = useMemo(
    () => allHabitLogs.filter((l) => l.logDate === today),
    [allHabitLogs, today],
  );
  const habitsProgress = useMemo(() => {
    const booleanHabits = habits.filter((h) => h.trackingType === 'boolean');
    const doneCount = booleanHabits.filter((h) =>
      todayHabitLogs.some((l) => l.habitId === h.id && l.value === 1),
    ).length;
    return { done: doneCount, total: booleanHabits.length };
  }, [habits, todayHabitLogs]);

  // On-device, free-for-all correlation insight cards. Recomputed when habits,
  // logs, or entries change; pure functions return null when conditions don't hold.
  const positiveCorrelationCard = useMemo(
    () => generatePositiveCorrelationInsight(habits, allHabitLogs, entries, t),
    [habits, allHabitLogs, entries, t],
  );
  const lowMoodNudgeCard = useMemo(
    () => generateLowMoodNudgeInsight(habits, allHabitLogs, entries, today, t),
    [habits, allHabitLogs, entries, today, t],
  );

  const handleMoodLogged = (entryId: string, moodId: string) => {
    router.push(`/mood-confirm?entryId=${entryId}&moodId=${moodId}` as Href);
  };

  return (
    <View style={styles.container}>
      {showBanner && (
        <View style={[styles.anonBanner, { paddingTop: insets.top + spacing.sm }]}>
          <SpringPressable
            style={styles.anonBannerContent}
            onPress={() => router.push('/register')}
            accessibilityRole="button"
            accessibilityLabel={t('home.anonBanner.a11ySignup')}
            accessibilityHint={t('home.anonBanner.a11yHint')}
          >
            <Text style={styles.anonBannerText}>
              {t('home.anonBanner.text')}{' '}
              <Text style={styles.anonBannerLink}>{t('home.anonBanner.link')}</Text>
            </Text>
          </SpringPressable>
          <Pressable
            onPress={dismissBanner}
            accessibilityRole="button"
            accessibilityLabel={t('home.anonBanner.a11yDismiss')}
            hitSlop={12}
            style={styles.anonBannerDismiss}
          >
            <Ionicons name="close" size={16} color={colors.textSecondary} />
          </Pressable>
        </View>
      )}

      <Screen scrollable={true} onScroll={onScroll}>
        <LinearGradient
          colors={[colors.skyStart, colors.skyEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <SparkleOverlay count={20} />
          <View style={styles.heroTextCol}>
            <Text style={styles.greeting}>{getGreeting()}</Text>
            <Text style={styles.greetingSub}>{motivationalMessage}</Text>
            {streak > 0 && (
              <Text
                style={styles.streakBadge}
                accessibilityLabel={t('home.streakA11y', { count: streak })}
              >
                {t('home.streak', { count: streak })}
              </Text>
            )}
          </View>
        </LinearGradient>

        <View style={styles.loggerCard}>
          <Text style={styles.loggerTitle} accessibilityRole="header">
            {t('checkIn.title')}
          </Text>
          <MoodLogger variant="screen" onLogged={handleMoodLogged} />
        </View>

        <HabitsSection
          habits={habits}
          todayLogs={todayHabitLogs}
          today={today}
          progress={habitsProgress}
          onLog={logHabit}
          onClear={clearHabitLog}
          onManage={() => router.push('/manage-habits' as Href)}
        />

        {(lowMoodNudgeCard || positiveCorrelationCard) && (
          <View style={styles.insightCardsWrapper}>
            {lowMoodNudgeCard && <InsightCard card={lowMoodNudgeCard} />}
            {positiveCorrelationCard && <InsightCard card={positiveCorrelationCard} />}
          </View>
        )}

        {isPro && !isAnonymous && (insightLoading || insightContent?.date === today) && (
          <DailyInsightCard
            content={insightContent?.date === today ? insightContent.content : null}
            isLoading={insightLoading}
          />
        )}

        <View style={styles.todaySection}>
          <View style={styles.sectionHeaderChip}>
            <Text
              style={styles.sectionHeader}
              accessibilityRole="header"
            >
              {todayEntries.length > 0
                ? t('home.todayHeaderCount', { count: todayEntries.length })
                : t('home.todayHeader')}
            </Text>
          </View>

          {todayEntries.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyHeader}>
                <Image
                  source={INSIGHT_CARD_IMAGES[emptyVariant.imageKey]}
                  style={{ width: emptySizes.illustration, height: emptySizes.illustration }}
                  resizeMode="contain"
                  accessibilityIgnoresInvertColors
                />
                <Text style={[styles.emptyTitle, { fontSize: emptySizes.title }]}>
                  {emptyVariant.title}
                </Text>
              </View>
              <Text
                style={[
                  styles.emptyBody,
                  { fontSize: emptySizes.body, lineHeight: emptySizes.bodyLine },
                ]}
              >
                {emptyVariant.body}
              </Text>

              <View style={styles.emptyTips}>
                <SpringPressable
                  style={[
                    styles.emptyTipRow,
                    { paddingVertical: emptySizes.rowPadV, paddingHorizontal: emptySizes.rowPadH },
                  ]}
                  onPress={() => router.push('/check-in' as Href)}
                  accessibilityRole="button"
                  accessibilityLabel={t('home.tipLogA11y')}
                >
                  <View
                    style={[
                      styles.emptyTipBadge,
                      {
                        width: emptySizes.badgeSize,
                        height: emptySizes.badgeSize,
                        borderRadius: emptySizes.badgeSize / 2,
                      },
                    ]}
                  >
                    <Ionicons name="happy-outline" size={emptySizes.iconSize} color={colors.primary} />
                  </View>
                  <View style={styles.emptyTipText}>
                    <Text style={[styles.emptyTipTitle, { fontSize: emptySizes.tipTitle }]}>
                      {t('home.tipLogTitle')}
                    </Text>
                    <Text
                      style={[
                        styles.emptyTipSub,
                        { fontSize: emptySizes.tipSub, lineHeight: emptySizes.tipSubLine },
                      ]}
                    >
                      {t('home.tipLogSub')}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={emptySizes.chevronSize} color={colors.textDisabled} />
                </SpringPressable>

                <SpringPressable
                  style={[
                    styles.emptyTipRow,
                    { paddingVertical: emptySizes.rowPadV, paddingHorizontal: emptySizes.rowPadH },
                  ]}
                  onPress={() => router.push('/manage-habits' as Href)}
                  accessibilityRole="button"
                  accessibilityLabel={t('home.tipHabitsA11y')}
                >
                  <View
                    style={[
                      styles.emptyTipBadge,
                      {
                        width: emptySizes.badgeSize,
                        height: emptySizes.badgeSize,
                        borderRadius: emptySizes.badgeSize / 2,
                      },
                    ]}
                  >
                    <Ionicons name="leaf-outline" size={emptySizes.iconSize} color={colors.primary} />
                  </View>
                  <View style={styles.emptyTipText}>
                    <Text style={[styles.emptyTipTitle, { fontSize: emptySizes.tipTitle }]}>
                      {t('home.tipHabitsTitle')}
                    </Text>
                    <Text
                      style={[
                        styles.emptyTipSub,
                        { fontSize: emptySizes.tipSub, lineHeight: emptySizes.tipSubLine },
                      ]}
                    >
                      {t('home.tipHabitsSub')}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={emptySizes.chevronSize} color={colors.textDisabled} />
                </SpringPressable>
              </View>

              <Text style={[styles.emptyAffirmation, { fontSize: emptySizes.affirmation }]}>
                {emptyVariant.affirmation}
              </Text>
            </View>
          ) : (
            todayEntries.map((entry) => {
              const entryMood = getMoodDef(entry.moodId, customMoods);
              const moodLabel = getMoodLabel(entry.moodId, customMoods);
              return (
                <SpringPressable
                  key={entry.id}
                  onPress={() => router.push(`/day-detail?date=${today}` as Href)}
                  accessibilityLabel={t('home.entryA11y', { mood: moodLabel, time: formatTime(entry.loggedAt) })}
                  accessibilityRole="button"
                >
                  <View style={styles.entryCard}>
                    <View style={styles.entryRow}>
                      {entryMood && (
                        <MoodBubble mood={entryMood} size="sm" showLabel={false} />
                      )}
                      <Text style={styles.entryMoodLabel}>
                        {moodLabel}
                      </Text>
                      <Text style={styles.entrySlotInline}>
                        {t(`home.slot.${entry.slot}`)}
                      </Text>
                      <View style={styles.entryRight}>
                        <Text style={styles.entryTime}>
                          {formatTime(entry.loggedAt)}
                        </Text>
                        <Ionicons name="chevron-forward" size={14} color={colors.textDisabled} />
                      </View>
                    </View>
                  </View>
                </SpringPressable>
              );
            })
          )}
        </View>
      </Screen>
    </View>
  );
}

// ─── Habits Quick-Log Section ─────────────────────────────────────────────────

interface HabitsSectionProps {
  habits: Habit[];
  todayLogs: HabitLog[];
  today: string;
  progress: { done: number; total: number };
  onLog: (habitId: string, logDate: string, value: number) => void;
  onClear: (habitId: string, logDate: string) => void;
  onManage: () => void;
}

function HabitsSection({ habits, todayLogs, today, progress, onLog, onClear, onManage }: HabitsSectionProps) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const habitStyles = useThemedStyles(createHabitStyles);
  const { t } = useTranslation('screens');

  // Group by tracking type so same-height cards land on the same grid row.
  // Booleans (single-row cards) first, then scales (taller two-row cards).
  const orderedHabits = useMemo(
    () =>
      [...habits].sort((a, b) => {
        if (a.trackingType === b.trackingType) return a.displayOrder - b.displayOrder;
        return a.trackingType === 'boolean' ? -1 : 1;
      }),
    [habits],
  );

  if (habits.length === 0) {
    return (
      <SpringPressable
        style={habitStyles.emptyRow}
        onPress={onManage}
        accessibilityRole="button"
        accessibilityLabel={t('home.habitsEmptyA11y')}
      >
        <Ionicons name="add-circle-outline" size={16} color={colors.primary} />
        <Text style={habitStyles.emptyText}>{t('home.habitsTrackDaily')}</Text>
      </SpringPressable>
    );
  }

  return (
    <View style={habitStyles.wrapper}>
      <View style={habitStyles.headerRow}>
        <View style={habitStyles.headerLeft}>
          <View style={styles.sectionHeaderChip}>
            <Text style={styles.sectionHeader}>{t('home.habitsHeader')}</Text>
          </View>
          {progress.total > 0 && (
            <View style={habitStyles.progressChip}>
              <Text style={habitStyles.progressChipText}>
                {progress.done}/{progress.total}
              </Text>
            </View>
          )}
        </View>
        <Pressable onPress={onManage} hitSlop={8} accessibilityRole="button" accessibilityLabel={t('home.habitsManageA11y')}>
          <Text style={habitStyles.manageLink}>{t('home.habitsManage')}</Text>
        </Pressable>
      </View>
      <View style={habitStyles.grid}>
        {orderedHabits.map((h) => {
          const log = todayLogs.find((l) => l.habitId === h.id);
          if (h.trackingType === 'boolean') {
            const done = log?.value === 1;
            return (
              <SpringPressable
                key={h.id}
                style={[habitStyles.card, done && habitStyles.cardDone]}
                onPress={() => done ? onClear(h.id, today) : onLog(h.id, today, 1)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: done }}
                accessibilityLabel={done ? t('home.habitDoneA11y', { name: h.name }) : t('home.habitNotDoneA11y', { name: h.name })}
              >
                <View style={habitStyles.cardRow}>
                  <HabitIcon icon={h.icon} size={18} color={colors.primary} circle circleSize={30} />
                  <Text
                    style={[habitStyles.cardName, done && habitStyles.cardNameDone]}
                    maxFontSizeMultiplier={1.3}
                    numberOfLines={1}
                  >
                    {h.name}
                  </Text>
                  <View style={[habitStyles.checkBox, done && habitStyles.checkBoxDone]}>
                    {done && <Ionicons name="checkmark" size={14} color={colors.textInverse} />}
                  </View>
                </View>
              </SpringPressable>
            );
          }
          // scale habit: 1–5 dots, stacked below name for compactness
          const currentValue = log?.value ?? 0;
          return (
            <View key={h.id} style={habitStyles.card}>
              <View style={habitStyles.cardRow}>
                <HabitIcon icon={h.icon} size={18} color={colors.primary} circle circleSize={30} />
                <Text style={habitStyles.cardName} numberOfLines={1}>{h.name}</Text>
              </View>
              <View style={habitStyles.scaleRow}>
                {[1, 2, 3, 4, 5].map((v) => (
                  <Pressable
                    key={v}
                    onPress={() => currentValue === v ? onClear(h.id, today) : onLog(h.id, today, v)}
                    style={[habitStyles.scaleDot, currentValue >= v && habitStyles.scaleDotActive]}
                    hitSlop={6}
                    accessibilityRole="button"
                    accessibilityLabel={t('home.habitLevelA11y', { name: h.name, n: v })}
                    accessibilityState={{ selected: currentValue >= v }}
                  />
                ))}
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const createHabitStyles = (colors: ThemePalette) => StyleSheet.create({
  wrapper: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  progressChip: {
    backgroundColor: colors.successLight,
    borderWidth: 1,
    borderColor: colors.successBorder,
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  progressChipText: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fonts.ui,
    color: colors.successText,
  },
  manageLink: {
    fontSize: typography.sizes.sm,
    color: colors.primary,
    fontFamily: typography.fonts.ui,
  },
  emptyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderStyle: 'dashed',
    backgroundColor: colors.surface,
  },
  emptyText: {
    fontSize: typography.sizes.sm,
    color: colors.primary,
    fontFamily: typography.fonts.ui,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  card: {
    ...shadows.sm,
    width: '48%',
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.md,
    paddingVertical: 8,
    paddingHorizontal: 10,
    gap: 6,
  },
  cardDone: {
    backgroundColor: colors.primaryLight,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardName: {
    flex: 1,
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.ui,
    color: colors.text,
  },
  cardNameDone: {
    color: colors.primaryDark,
  },
  checkBox: {
    width: 20,
    height: 20,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkBoxDone: {
    borderColor: colors.success,
    backgroundColor: colors.success,
  },
  scaleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 2,
    paddingBottom: 2,
  },
  scaleDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  scaleDotActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
});

// ─── Daily Insight Card ───────────────────────────────────────────────────────

function DailyInsightCard({ content, isLoading }: { content: string | null; isLoading: boolean }) {
  const { colors } = useTheme();
  const insightStyles = useThemedStyles(createInsightStyles);
  const { t } = useTranslation('screens');
  return (
    <View style={insightStyles.wrapper}>
      <View style={insightStyles.header}>
        <Ionicons name="sparkles" size={12} color={colors.primary} />
        <Text style={insightStyles.headerText}>{t('home.insightHeader')}</Text>
      </View>
      {isLoading && !content ? (
        <View style={insightStyles.loadingRow}>
          <ActivityIndicator size="small" color={colors.pink} />
          <Text style={insightStyles.loadingText}>{t('home.insightLoading')}</Text>
        </View>
      ) : content ? (
        <Text style={insightStyles.body}>{content}</Text>
      ) : null}
    </View>
  );
}

const createInsightStyles = (colors: ThemePalette) => StyleSheet.create({
  wrapper: {
    marginTop: spacing.md,
    backgroundColor: colors.pinkLight,
    borderRadius: radius.card,
    borderWidth: 0.5,
    borderColor: colors.pinkBorder,
    padding: spacing.md,
    gap: spacing.xs,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  headerText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    color: colors.pink,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  body: {
    fontSize: typography.sizes.body,
    color: colors.text,
    lineHeight: 22,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  loadingText: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
  },
});

const createStyles = (colors: ThemePalette) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  anonBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  anonBannerContent: {
    flex: 1,
  },
  anonBannerDismiss: {
    paddingLeft: spacing.sm,
  },
  anonBannerText: {
    fontSize: typography.sizes.sm,
    color: colors.text,
  },
  anonBannerLink: {
    fontWeight: typography.weights.semibold,
    color: colors.primary,
  },
  heroCard: {
    ...shadows.md,
    borderRadius: radius.xxl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.32)',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    marginTop: spacing.xs,
  },
  heroTextCol: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  greeting: {
    fontSize: typography.sizes.xxl,
    fontFamily: typography.fonts.display,
    color: colors.textInverse,
    letterSpacing: -0.6,
    lineHeight: 34,
  },
  greetingSub: {
    fontSize: typography.sizes.body,
    color: colors.sparkle,
    textAlign: 'center',
    paddingHorizontal: spacing.sm,
  },
  streakBadge: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    color: colors.accent,
    backgroundColor: colors.accentLight,
    borderWidth: 1,
    borderColor: colors.accentBorder,
    borderRadius: 999,
    paddingVertical: 3,
    paddingHorizontal: spacing.sm,
  },
  loggerCard: {
    ...shadows.sm,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginTop: spacing.md,
    paddingHorizontal: 0,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  loggerTitle: {
    fontSize: typography.sizes.md,
    fontFamily: typography.fonts.display,
    color: colors.text,
    textAlign: 'center',
  },
  todaySection: {
    paddingBottom: spacing.xl,
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  insightCardsWrapper: {
    marginTop: spacing.md,
  },
  sectionHeaderChip: {
    alignSelf: 'flex-start',
    backgroundColor: colors.accentLight,
    borderWidth: 1,
    borderColor: colors.accentBorder,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  sectionHeader: {
    fontSize: typography.sizes.md,
    fontFamily: typography.fonts.ui,
    color: colors.accent,
  },
  emptyState: {
    ...shadows.sm,
    backgroundColor: colors.accentLight,
    borderRadius: radius.card,
    padding: spacing.md,
    gap: spacing.sm,
  },
  emptyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  emptyTitle: {
    fontSize: typography.sizes.xl,
    fontFamily: typography.fonts.display,
    color: colors.accent,
  },
  emptyBody: {
    fontSize: typography.sizes.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: spacing.sm,
  },
  emptyTips: {
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  emptyTipRow: {
    ...shadows.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.md,
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
  },
  emptyTipBadge: {
    width: 36,
    height: 36,
    borderRadius: radius.xxl,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTipText: {
    flex: 1,
  },
  emptyTipTitle: {
    fontSize: typography.sizes.body,
    fontFamily: typography.fonts.ui,
    fontWeight: typography.weights.semibold,
    color: colors.text,
  },
  emptyTipSub: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    marginTop: 3,
    lineHeight: 18,
  },
  emptyAffirmation: {
    fontSize: typography.sizes.sm,
    color: colors.accent,
    textAlign: 'center',
    fontFamily: typography.fonts.ui,
    fontWeight: typography.weights.semibold,
    marginTop: spacing.xs,
  },
  entryCard: {
    ...shadows.sm,
    borderRadius: 12,
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: spacing.sm,
    paddingVertical: 10,
  },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  entryMoodLabel: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.ui,
    color: colors.text,
    flex: 1,
  },
  entrySlotInline: {
    fontSize: typography.sizes.xs,
    color: colors.primaryDark,
    backgroundColor: colors.primaryLight,
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 2,
    overflow: 'hidden',
  },
  entryRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  entryTime: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
  },
});

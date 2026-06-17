import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, type LayoutChangeEvent } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Screen, Card, AnimatedNumber, HabitIcon } from '@components/index';
import { EmptyState } from '@components/EmptyState';
import { SparkleOverlay } from '@components/SparkleOverlay';
import { TabletSplit } from '@components/TabletSplit';
import { useMoodEntryStore, useSessionStore } from '@store/index';
import { useHabitsStore } from '@store/habitsStore';
import { useScreenScroll } from '@hooks/useScreenScroll';
import { filterEntriesByDays, getMoodFrequency, getDailyMoodScores, GROUP_SCORES } from '@lib/insights';
import { detectPatterns, calculateResilienceScore, type ResilienceResult } from '@lib/patterns';
import { computeHabitCorrelations, correlationColor, type HabitCorrelation } from '@lib/correlations';
import { BarChart, LineChart } from 'react-native-gifted-charts';
import { typography, spacing, radius, shadows } from '@constants/theme';
import { useTheme, type ThemePalette } from '@theme/ThemeContext';
import { useThemedStyles } from '@hooks/useThemedStyles';
import { MOOD_MAP } from '@constants/moods';
import type { MoodSlot } from '@models/index';

type Period = 7 | 30;
type InsightsTab = 'overview' | 'patterns' | 'reports';
const INSIGHTS_TABS: InsightsTab[] = ['overview', 'patterns', 'reports'];

export default function InsightsScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [period, setPeriod] = useState<Period>(7);
  const [activeTab, setActiveTab] = useState<InsightsTab>('overview');
  const router = useRouter();
  const { t } = useTranslation('screens');
  const { onScroll } = useScreenScroll();
  // Charts must size against the actual rendered column (Screen clamps to a
  // tablet-friendly max-width), not the full window. Measured via onLayout
  // on each chart container; default keeps charts non-zero on first paint.
  // Each chart container has its own measurement so the bar and trend charts
  // can sit side-by-side on tablets without sharing a width.
  const [barChartContainerWidth, setBarChartContainerWidth] = useState(0);
  const [trendChartContainerWidth, setTrendChartContainerWidth] = useState(0);
  const handleBarLayout = useCallback((e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0 && w !== barChartContainerWidth) setBarChartContainerWidth(w);
  }, [barChartContainerWidth]);
  const handleTrendLayout = useCallback((e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0 && w !== trendChartContainerWidth) setTrendChartContainerWidth(w);
  }, [trendChartContainerWidth]);
  // Subtract the chart container's horizontal padding (spacing.sm * 2 = 16)
  // so the chart's parentWidth matches the actual area available for SVG.
  const barChartWidth = barChartContainerWidth > 0 ? Math.max(barChartContainerWidth - 16, 200) : 280;
  const trendChartWidth = trendChartContainerWidth > 0 ? Math.max(trendChartContainerWidth - 16, 200) : 280;

  const entries = useMoodEntryStore((s) => s.entries);
  const session = useSessionStore((s) => s.session);
  const isPro = session?.subscriptionStatus === 'trial' || session?.subscriptionStatus === 'active';

  const filtered = useMemo(
    () => filterEntriesByDays(entries, period),
    [entries, period],
  );

  const frequency = useMemo(() => getMoodFrequency(filtered), [filtered]);
  const dailyScores = useMemo(() => getDailyMoodScores(filtered, period), [filtered, period]);
  const trendPointCount = useMemo(
    () => dailyScores.filter((d) => d.score !== null).length,
    [dailyScores],
  );
  const patterns = useMemo(() => detectPatterns(filtered), [filtered]);
  const totalEntries = filtered.length;

  const habits = useHabitsStore((s) => s.habits);
  const habitLogs = useHabitsStore((s) => s.logs);

  const resilienceCurrent = useMemo(() => calculateResilienceScore(filtered), [filtered]);
  const resiliencePrior = useMemo(() => {
    const nowMs = Date.now();
    const currentCutoff = new Date(nowMs - period * 24 * 60 * 60 * 1000).toISOString();
    const priorCutoff = new Date(nowMs - period * 2 * 24 * 60 * 60 * 1000).toISOString();
    const priorEntries = entries.filter((e) => e.loggedAt < currentCutoff && e.loggedAt >= priorCutoff);
    return calculateResilienceScore(priorEntries);
  }, [entries, period]);

  const habitCorrelations = useMemo(
    () => computeHabitCorrelations(habits, habitLogs, filtered),
    [habits, habitLogs, filtered],
  );

  // Correlation matrix: slot × day-of-week → average mood score
  const correlationMatrix = useMemo(() => {
    const matrix: Record<string, Record<number, number[]>> = {};
    for (const e of filtered) {
      const slot = e.slot;
      const dow = new Date(e.loggedAt).getDay(); // 0=Sun...6=Sat
      if (!matrix[slot]) matrix[slot] = {};
      if (!matrix[slot][dow]) matrix[slot][dow] = [];
      const mood = MOOD_MAP[e.moodId as keyof typeof MOOD_MAP];
      const score = mood ? GROUP_SCORES[mood.group] : 3;
      matrix[slot][dow].push(score);
    }
    return matrix;
  }, [filtered]);

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

  const activeDays = useMemo(
    () => new Set(filtered.map((e) => e.loggedAt.split('T')[0])).size,
    [filtered],
  );

  const barData = useMemo(
    () =>
      frequency.slice(0, 6).map((item) => ({
        value: item.count,
        frontColor: item.color,
        label: item.label,
        labelTextStyle: { fontSize: 9, color: colors.textSecondary },
      })),
    [frequency],
  );

  const lineData = useMemo(
    () => {
      // Interpolate gaps locally instead of passing NaN to gifted-charts'
      // interpolateMissingValues — on Android the curved+areaChart path
      // generator leaks NaN into the SVG `d` attribute, and react-native-svg
      // rejects it with IllegalArgumentException at PathParser.
      const filled: number[] = [];
      const n = dailyScores.length;
      for (let i = 0; i < n; i++) {
        const s = dailyScores[i].score;
        if (s !== null) {
          filled[i] = s;
          continue;
        }
        let prevIdx = i - 1;
        while (prevIdx >= 0 && dailyScores[prevIdx].score === null) prevIdx--;
        let nextIdx = i + 1;
        while (nextIdx < n && dailyScores[nextIdx].score === null) nextIdx++;
        const prev = prevIdx >= 0 ? dailyScores[prevIdx].score! : null;
        const next = nextIdx < n ? dailyScores[nextIdx].score! : null;
        if (prev !== null && next !== null) {
          const t = (i - prevIdx) / (nextIdx - prevIdx);
          filled[i] = prev + (next - prev) * t;
        } else if (prev !== null) {
          filled[i] = prev;
        } else if (next !== null) {
          filled[i] = next;
        } else {
          filled[i] = 0;
        }
      }
      return dailyScores.map((item, index) => ({
        value: filled[index],
        hideDataPoint: item.score === null,
        label: period === 30 ? (index % 5 === 0 ? item.label : '') : item.label,
        labelTextStyle: { fontSize: 9, color: colors.textSecondary },
      }));
    },
    [dailyScores, period],
  );

  if (filtered.length === 0) {
    return (
      <Screen scrollable={true} layout="wide" onScroll={onScroll}>
        <LinearGradient
          colors={[colors.skyStart, colors.skyEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <SparkleOverlay />
          <Text style={styles.screenTitle} accessibilityRole="header">
            {t('insights.hero.title')}
          </Text>
          <Text style={styles.heroSubtitle}>{t('insights.hero.subtitle')}</Text>
          <PeriodToggle period={period} onSelect={setPeriod} />
        </LinearGradient>
        <View style={styles.emptyContainer}>
          <EmptyState
            illustration="chart"
            title={t('insights.empty.title')}
            description={t('insights.empty.subtitle')}
          />
        </View>
      </Screen>
    );
  }

  return (
    <Screen scrollable={true} layout="wide" onScroll={onScroll}>
      <LinearGradient
        colors={[colors.skyStart, colors.skyEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroCard}
      >
        <SparkleOverlay count={20} />
        <View style={styles.badgeRow}>
          <Ionicons name="sparkles" size={12} color={colors.textInverse} />
          <Text style={styles.badgeText}>{t('insights.hero.badge')}</Text>
        </View>
        <Text style={styles.screenTitle} accessibilityRole="header">
          {t('insights.hero.title')}
        </Text>
        <Text style={styles.heroSubtitle}>{t('insights.hero.subtitle')}</Text>
        <PeriodToggle period={period} onSelect={setPeriod} />
      </LinearGradient>

      <View style={styles.tabBar} accessibilityRole="tablist">
        {INSIGHTS_TABS.map((tab) => {
          const selected = activeTab === tab;
          return (
            <Pressable
              key={tab}
              style={[styles.tab, selected && styles.tabActive]}
              onPress={() => setActiveTab(tab)}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              accessibilityLabel={t(`insights.tabs.${tab}`)}
            >
              <Text style={[styles.tabLabel, selected && styles.tabLabelActive]}>
                {t(`insights.tabs.${tab}`)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {activeTab === 'overview' && (
        <>
      <View style={styles.heroStatCard}>
        <View style={styles.heroStatLeft}>
          <Text style={styles.heroStatLabel} maxFontSizeMultiplier={1.3}>
            {t('insights.stats.streakHero.label')}
          </Text>
          <AnimatedNumber
            value={streak}
            style={styles.heroStatValue}
            accessibilityLabel={t('insights.stats.streakA11y', { count: streak })}
            maxFontSizeMultiplier={1.15}
          />
          <Text style={styles.heroStatSub} maxFontSizeMultiplier={1.3}>
            {streak > 0
              ? t('insights.stats.streakHero.subActive')
              : t('insights.stats.streakHero.subZero')}
          </Text>
        </View>
        <View style={styles.heroStatIconWrap}>
          <Ionicons name="flame" size={32} color={colors.accent} />
        </View>
      </View>

      <View style={styles.statsRow}>
        <Card style={styles.statCard}>
          <AnimatedNumber
            value={totalEntries}
            style={styles.statValue}
            accessibilityLabel={t('insights.stats.checkInsA11y', { count: totalEntries })}
            maxFontSizeMultiplier={1.2}
          />
          <Text style={styles.statLabel}>{t('insights.stats.checkIns')}</Text>
        </Card>
        <Card style={styles.statCard}>
          <AnimatedNumber
            value={activeDays}
            style={styles.statValue}
            accessibilityLabel={t('insights.stats.activeDaysA11y', { count: activeDays })}
            maxFontSizeMultiplier={1.2}
          />
          <Text style={styles.statLabel}>{t('insights.stats.activeDays')}</Text>
        </Card>
      </View>

      {(frequency.length > 0 || trendPointCount > 1) && (
        <TabletSplit
          collapseAt="tablet"
          primary={
            frequency.length > 0 ? (
              <View>
                <Text style={styles.sectionHeader} accessibilityRole="header">
                  {t('insights.sections.topMoods')}
                </Text>
                <View
                  style={styles.chartContainer}
                  onLayout={handleBarLayout}
                  accessibilityLabel={t('insights.charts.barA11y', { count: Math.min(frequency.length, 6) })}
                >
                  <BarChart
                    data={barData}
                    width={barChartWidth}
                    parentWidth={barChartWidth}
                    adjustToWidth
                    disableScroll
                    noOfSections={4}
                    yAxisTextStyle={styles.axisText}
                    xAxisLabelTextStyle={styles.axisText}
                    hideRules={false}
                    rulesColor={colors.borderLight}
                    isAnimated
                    barBorderRadius={4}
                    yAxisThickness={0}
                    xAxisThickness={1}
                    xAxisColor={colors.borderLight}
                  />
                </View>
              </View>
            ) : <View />
          }
          secondary={
            trendPointCount > 1 ? (
              <View>
                <Text style={styles.sectionHeader} accessibilityRole="header">
                  {t('insights.sections.trend')}
                </Text>
                <View
                  style={styles.chartContainer}
                  onLayout={handleTrendLayout}
                  accessibilityLabel={t('insights.charts.trendA11y', { count: period })}
                >
                  <LineChart
                    data={lineData}
                    width={trendChartWidth}
                    parentWidth={trendChartWidth}
                    adjustToWidth
                    disableScroll
                    color={colors.primary}
                    thickness={2}
                    dataPointsColor={colors.primary}
                    noOfSections={4}
                    maxValue={4}
                    yAxisTextStyle={styles.axisText}
                    xAxisLabelTextStyle={styles.axisText}
                    hideRules={false}
                    rulesColor={colors.borderLight}
                    curved
                    isAnimated
                    areaChart
                    startFillColor={colors.primaryLight}
                    endFillColor={colors.background}
                    startOpacity={0.4}
                    endOpacity={0.05}
                    yAxisThickness={0}
                    xAxisThickness={1}
                    xAxisColor={colors.borderLight}
                  />
                </View>
              </View>
            ) : <View />
          }
        />
      )}
        </>
      )}

      {activeTab === 'patterns' && (
        <>
      {patterns.length > 0 && (
        <View>
          <Text style={styles.sectionHeader} accessibilityRole="header">
            {t('insights.sections.patterns')}
          </Text>
          <View style={styles.patternList}>
            {patterns.map((p) => (
              <View key={p.id} accessibilityLabel={p.text}>
                <Card style={styles.patternCard}>
                  <Ionicons name={p.icon} size={18} color={colors.primary} style={styles.patternIcon} />
                  <Text style={styles.patternText}>{p.text}</Text>
                </Card>
              </View>
            ))}
          </View>
        </View>
      )}

      {filtered.length > 0 && filtered.length < 7 && patterns.length === 0 && (
        <View>
          <Text style={styles.sectionHeader} accessibilityRole="header">
            {t('insights.sections.patterns')}
          </Text>
          <Text style={styles.patternHint}>{t('insights.patternsHint')}</Text>
        </View>
      )}

      {/* Resilience Score — Pro feature */}
      {filtered.length > 0 && (
        isPro ? (
          <View style={styles.standaloneCardWrap}>
            <ResilienceCard current={resilienceCurrent} prior={resiliencePrior} />
          </View>
        ) : (
          <Pressable
            onPress={() => router.push('/paywall')}
            accessibilityRole="button"
            accessibilityLabel={t('insights.resilienceCard.lockedA11y')}
            style={styles.standaloneCardWrap}
          >
            <Card style={styles.proLockCard}>
              <Ionicons name="fitness-outline" size={22} color={colors.primary} style={styles.proLockIcon} />
              <View style={styles.proLockInfo}>
                <Text style={styles.proLockTitle}>{t('insights.resilienceCard.lockedTitle')}</Text>
                <Text style={styles.proLockSubtitle}>{t('insights.resilienceCard.lockedSubtitle')}</Text>
              </View>
              <View style={styles.proLockBadge}>
                <Text style={styles.proLockBadgeText}>{t('insights.proBadge')}</Text>
              </View>
            </Card>
          </Pressable>
        )
      )}

      {/* Correlations — Pro feature */}
      {filtered.length > 0 && (
        isPro ? (
          <View style={styles.standaloneCardWrap}>
            <CorrelationHeatmap matrix={correlationMatrix} />
          </View>
        ) : (
          <Pressable
            onPress={() => router.push('/paywall')}
            accessibilityRole="button"
            accessibilityLabel={t('insights.correlationsCard.lockedA11y')}
            style={styles.standaloneCardWrap}
          >
            <Card style={styles.proLockCard}>
              <Ionicons name="search" size={22} color={colors.primary} style={styles.proLockIcon} />
              <View style={styles.proLockInfo}>
                <Text style={styles.proLockTitle}>{t('insights.correlationsCard.lockedTitle')}</Text>
                <Text style={styles.proLockSubtitle}>{t('insights.correlationsCard.lockedSubtitle')}</Text>
              </View>
              <View style={styles.proLockBadge}>
                <Text style={styles.proLockBadgeText}>{t('insights.proBadge')}</Text>
              </View>
            </Card>
          </Pressable>
        )
      )}

      {/* Habits × Mood — top 2 positive free, full list Pro */}
      {habits.length > 0 && filtered.length > 0 && (
        <View>
          <Text style={styles.sectionHeader} accessibilityRole="header">
            {t('insights.sections.habitsAndMood')}
          </Text>
          {(() => {
            if (habitCorrelations.length === 0) {
              // No signal yet — same prompt for free and Pro: log more data.
              if (isPro) {
                return (
                  <Card style={styles.proLockCard}>
                    <Ionicons name="bar-chart" size={22} color={colors.primary} style={styles.proLockIcon} />
                    <View style={styles.proLockInfo}>
                      <Text style={styles.proLockTitle}>{t('insights.habitCorrelations.needsMoreTitle')}</Text>
                      <Text style={styles.proLockSubtitle}>{t('insights.habitCorrelations.needsMoreSubtitle')}</Text>
                    </View>
                  </Card>
                );
              }
              return (
                <Pressable
                  onPress={() => router.push('/paywall')}
                  accessibilityRole="button"
                  accessibilityLabel={t('insights.habitCorrelations.lockedA11y')}
                >
                  <Card style={styles.proLockCard}>
                    <Ionicons name="bar-chart" size={22} color={colors.primary} style={styles.proLockIcon} />
                    <View style={styles.proLockInfo}>
                      <Text style={styles.proLockTitle}>{t('insights.habitCorrelations.needsMoreTitle')}</Text>
                      <Text style={styles.proLockSubtitle}>{t('insights.habitCorrelations.needsMoreSubtitle')}</Text>
                    </View>
                  </Card>
                </Pressable>
              );
            }
            if (isPro) {
              return <HabitCorrelationList correlations={habitCorrelations} />;
            }
            // Free: top 2 positive correlations + upsell row for full list.
            const topPositives = habitCorrelations
              .filter((c) => c.correlation > 0)
              .slice(0, 2);
            return (
              <View>
                {topPositives.length > 0 && <HabitCorrelationList correlations={topPositives} />}
                <Pressable
                  onPress={() => router.push('/paywall')}
                  accessibilityRole="button"
                  accessibilityLabel={t('insights.habitCorrelations.seeAllProA11y')}
                >
                  <Card style={styles.proLockCard}>
                    <Ionicons name="bar-chart" size={22} color={colors.primary} style={styles.proLockIcon} />
                    <View style={styles.proLockInfo}>
                      <Text style={styles.proLockTitle}>{t('insights.habitCorrelations.seeAllPro')}</Text>
                      <Text style={styles.proLockSubtitle}>{t('insights.habitCorrelations.lockedSubtitle')}</Text>
                    </View>
                    <View style={styles.proLockBadge}>
                      <Text style={styles.proLockBadgeText}>{t('insights.proBadge')}</Text>
                    </View>
                  </Card>
                </Pressable>
              </View>
            );
          })()}
        </View>
      )}
        </>
      )}

      {activeTab === 'reports' && (filtered.length > 0 || entries.length > 0) && (
        <View>
          <Text style={styles.sectionHeader} accessibilityRole="header">
            {t('insights.sections.reports')}
          </Text>
          <View style={styles.reportsList}>
            {filtered.length > 0 && (
              <Pressable
                onPress={() => router.push('/ai-report')}
                accessibilityRole="button"
                accessibilityLabel={t('insights.aiReport.a11y')}
              >
                <Card style={styles.aiReportCard}>
                  <Ionicons name="sparkles" size={22} color={colors.primary} style={styles.aiReportIcon} />
                  <View style={styles.aiReportInfo}>
                    <Text style={styles.aiReportTitle}>{t('insights.aiReport.title')}</Text>
                    <Text style={styles.aiReportSubtitle}>{t('insights.aiReport.subtitle')}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                </Card>
              </Pressable>
            )}
            {entries.length > 0 && (
              <Pressable
                onPress={() => router.push('/annual-report')}
                accessibilityRole="button"
                accessibilityLabel={t('insights.yearInMood.a11y')}
              >
                <Card style={styles.aiReportCard}>
                  <Ionicons name="calendar" size={22} color={colors.primary} style={styles.aiReportIcon} />
                  <View style={styles.aiReportInfo}>
                    <Text style={styles.aiReportTitle}>
                      {t('insights.yearInMood.title', { year: new Date().getFullYear() })}
                    </Text>
                    <Text style={styles.aiReportSubtitle}>{t('insights.yearInMood.subtitle')}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                </Card>
              </Pressable>
            )}
          </View>
        </View>
      )}
    </Screen>
  );
}

// ─── Habit Correlation ───────────────────────────────────────────────────────
// Math + types extracted to `src/lib/correlations.ts` so the Home tab insight
// generators can reuse the same logic. This file keeps only the presentational
// list component.

function HabitCorrelationList({ correlations }: { correlations: HabitCorrelation[] }) {
  const { colors } = useTheme();
  const corrStyles = useThemedStyles(createCorrStyles);
  const { t } = useTranslation('screens');
  return (
    <View style={corrStyles.container}>
      {correlations.map(({ habit, correlation, strength }) => {
        const barWidth = Math.abs(correlation) * 100;
        const color = correlationColor(correlation);
        const label = t(`insights.habitCorrelations.strength.${strength}`);
        return (
          <View
            key={habit.id}
            style={corrStyles.row}
            accessibilityLabel={t('insights.habitCorrelations.rowA11y', { habit: habit.name, label })}
          >
            <HabitIcon icon={habit.icon} size={18} color={colors.primary} circle circleSize={32} />
            <View style={corrStyles.info}>
              <View style={corrStyles.nameLine}>
                <Text style={corrStyles.habitName}>{habit.name}</Text>
                <Text style={[corrStyles.labelText, { color }]}>{label}</Text>
              </View>
              <View style={corrStyles.barTrack}>
                <View style={[corrStyles.barFill, { width: `${Math.max(barWidth, 4)}%` as any, backgroundColor: color }]} />
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const createCorrStyles = (colors: ThemePalette) => StyleSheet.create({
  container: {
    ...shadows.sm,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.card,
    padding: spacing.md,
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  info: {
    flex: 1,
    gap: 6,
  },
  nameLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  habitName: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.ui,
    color: colors.text,
  },
  labelText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
  },
  barTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.borderLight,
    overflow: 'hidden',
  },
  barFill: {
    height: 6,
    borderRadius: 3,
  },
});

// ─── Correlation Heatmap ──────────────────────────────────────────────────────

const DOW_ORDER = [1, 2, 3, 4, 5, 6, 0]; // Mon...Sun

const SLOT_ORDER: MoodSlot[] = ['morning', 'afternoon', 'night', 'pre_sleep'];

function scoreToColor(score: number | null): string {
  if (score === null) return '#F0F0F0';
  if (score >= 3.5) return '#66BB6A';
  if (score >= 2.5) return '#80DEEA';
  if (score >= 1.5) return '#FFD54F';
  return '#EF5350';
}

function CorrelationHeatmap({
  matrix,
}: {
  matrix: Record<string, Record<number, number[]>>;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const heatmapStyles = useThemedStyles(createHeatmapStyles);
  const weekdayInitials = t('dates:weekdayInitial', { returnObjects: true }) as string[];
  // dates.weekdayInitial is Sunday-first; reorder to Mon..Sun to match DOW_ORDER.
  const dowLabels = DOW_ORDER.map((dow) => weekdayInitials[dow]);
  const legendItems: { color: string; key: 'low' | 'mixed' | 'good' | 'great' | 'noData' }[] = [
    { color: '#EF5350', key: 'low' },
    { color: '#FFD54F', key: 'mixed' },
    { color: '#80DEEA', key: 'good' },
    { color: '#66BB6A', key: 'great' },
    { color: '#F0F0F0', key: 'noData' },
  ];
  return (
    <View
      style={heatmapStyles.container}
      accessibilityLabel={t('screens:insights.correlationsCard.heatmapA11y')}
    >
      <Text style={heatmapStyles.cardTitle}>
        {t('screens:insights.correlationsCard.title')}
      </Text>
      {/* Column headers */}
      <View style={heatmapStyles.row}>
        <View style={heatmapStyles.rowLabel} />
        {dowLabels.map((label, i) => (
          <View key={i} style={heatmapStyles.cell}>
            <Text style={heatmapStyles.colLabel}>{label}</Text>
          </View>
        ))}
      </View>
      {/* Data rows */}
      {SLOT_ORDER.map((slot) => (
        <View key={slot} style={heatmapStyles.row}>
          <View style={heatmapStyles.rowLabel}>
            <Text style={heatmapStyles.rowLabelText}>
              {t(`screens:insights.correlationsCard.slotShort.${slot}`)}
            </Text>
          </View>
          {DOW_ORDER.map((dow, i) => {
            const scores = matrix[slot]?.[dow];
            const avg = scores?.length
              ? scores.reduce((s, v) => s + v, 0) / scores.length
              : null;
            return (
              <View key={i} style={heatmapStyles.cell}>
                <View
                  style={[heatmapStyles.dot, { backgroundColor: scoreToColor(avg) }]}
                  accessibilityLabel={avg !== null
                    ? t('screens:insights.correlationsCard.cellA11y', { score: avg.toFixed(1) })
                    : t('screens:insights.correlationsCard.noDataA11y')}
                />
              </View>
            );
          })}
        </View>
      ))}
      {/* Legend */}
      <View style={heatmapStyles.legend}>
        {legendItems.map(({ color, key }) => (
          <View key={key} style={heatmapStyles.legendItem}>
            <View style={[heatmapStyles.legendDot, { backgroundColor: color }]} />
            <Text style={heatmapStyles.legendLabel}>
              {t(`screens:insights.correlationsCard.legend.${key}`)}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const createHeatmapStyles = (colors: ThemePalette) => StyleSheet.create({
  container: {
    ...shadows.sm,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.card,
    padding: spacing.md,
    gap: 4,
  },
  cardTitle: {
    fontSize: typography.sizes.body,
    fontFamily: typography.fonts.ui,
    fontWeight: typography.weights.semibold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rowLabel: {
    width: 44,
    alignItems: 'flex-end',
    paddingRight: 4,
  },
  rowLabelText: {
    fontSize: 10,
    color: colors.textSecondary,
  },
  cell: {
    flex: 1,
    alignItems: 'center',
  },
  colLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  dot: {
    width: 26,
    height: 26,
    borderRadius: 6,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 3,
  },
  legendLabel: {
    fontSize: 10,
    color: colors.textSecondary,
  },
});

// ─── Resilience Card ─────────────────────────────────────────────────────────

function scoreToResilienceColor(score: number): string {
  if (score >= 70) return '#66BB6A';
  if (score >= 40) return '#FFB300';
  return '#EF5350';
}

function ResilienceCard({
  current,
  prior,
}: {
  current: ResilienceResult | null;
  prior: ResilienceResult | null;
}) {
  const { colors } = useTheme();
  const resilienceStyles = useThemedStyles(createResilienceStyles);
  const { t } = useTranslation('screens');
  if (!current) {
    return (
      <Card style={resilienceStyles.container}>
        <Text style={resilienceStyles.emptyText}>
          {t('insights.resilienceCard.empty')}
        </Text>
      </Card>
    );
  }

  const trendDiff = prior ? current.score - prior.score : null;
  const trendIcon: React.ComponentProps<typeof Ionicons>['name'] | null =
    trendDiff === null ? null : trendDiff > 5 ? 'arrow-up' : trendDiff < -5 ? 'arrow-down' : 'arrow-forward';
  const trendColor = trendDiff === null ? colors.textSecondary : trendDiff > 5 ? '#66BB6A' : trendDiff < -5 ? '#EF5350' : colors.textSecondary;

  const avgHoursDisplay =
    current.avgHours < 1
      ? t('insights.resilienceCard.recoveryMinutes', { n: Math.round(current.avgHours * 60) })
      : current.avgHours < 24
      ? t('insights.resilienceCard.recoveryHours', { n: Math.round(current.avgHours) })
      : t('insights.resilienceCard.recoveryDays', { n: (current.avgHours / 24).toFixed(1) });

  return (
    <Card
      style={resilienceStyles.container}
      accessibilityLabel={t('insights.resilienceCard.scoreA11y', { score: current.score })}
    >
      <View style={resilienceStyles.scoreRow}>
        <View>
          <View style={resilienceStyles.scoreLine}>
            <Text style={[resilienceStyles.scoreValue, { color: scoreToResilienceColor(current.score) }]}>
              {current.score}
            </Text>
            <Text style={resilienceStyles.scoreMax}>/100</Text>
            {trendIcon && (
              <Ionicons name={trendIcon} size={18} color={trendColor} style={resilienceStyles.trendArrow} />
            )}
          </View>
          <Text style={resilienceStyles.scoreLabel}>{t('insights.resilienceCard.title')}</Text>
        </View>
        <Ionicons name="fitness" size={28} color={colors.primary} style={resilienceStyles.icon} />
      </View>
      <Text style={resilienceStyles.detail}>
        {avgHoursDisplay} · {t('insights.resilienceCard.basedOn', { count: current.recoveries })}
      </Text>
      <View style={resilienceStyles.barTrack}>
        <View style={[resilienceStyles.barFill, { width: `${current.score}%` as any, backgroundColor: scoreToResilienceColor(current.score) }]} />
      </View>
    </Card>
  );
}

const createResilienceStyles = (colors: ThemePalette) => StyleSheet.create({
  container: {
    borderWidth: 1,
    borderColor: colors.borderLight,
    gap: spacing.sm,
  },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  scoreLine: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  scoreValue: {
    fontSize: 40,
    fontWeight: '700',
    lineHeight: 44,
  },
  scoreMax: {
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
  },
  trendArrow: {
    marginLeft: 4,
    alignSelf: 'center',
  },
  scoreLabel: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  icon: {},
  detail: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
  },
  barTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.borderLight,
    overflow: 'hidden',
  },
  barFill: {
    height: 6,
    borderRadius: 3,
  },
  emptyText: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: spacing.sm,
  },
});

// ─── Period Toggle ────────────────────────────────────────────────────────────

function PeriodToggle({
  period,
  onSelect,
}: {
  period: Period;
  onSelect: (p: Period) => void;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { t } = useTranslation('screens');
  return (
    <View style={styles.toggleRow}>
      {([7, 30] as Period[]).map((p) => {
        const selected = period === p;
        return (
          <Pressable
            key={p}
            onPress={() => onSelect(p)}
            style={[styles.togglePill, selected ? styles.toggleSelected : styles.toggleUnselected]}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={t('insights.period.a11y', { n: p })}
          >
            <Text style={[styles.toggleText, selected ? styles.toggleTextSelected : styles.toggleTextUnselected]}>
              {t('insights.period.label', { n: p })}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const createStyles = (colors: ThemePalette) => StyleSheet.create({
  heroCard: {
    ...shadows.md,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: 4,
    gap: 4,
    marginBottom: spacing.md,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabActive: {
    ...shadows.sm,
    backgroundColor: colors.surfaceElevated,
  },
  tabLabel: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.ui,
    fontWeight: typography.weights.medium,
    color: colors.textSecondary,
  },
  tabLabelActive: {
    color: colors.text,
    fontWeight: typography.weights.semibold,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.36)',
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  badgeText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    color: colors.textInverse,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  screenTitle: {
    fontSize: typography.sizes.xl,
    fontFamily: typography.fonts.display,
    color: colors.textInverse,
    letterSpacing: -0.4,
    lineHeight: 28,
  },
  heroSubtitle: {
    fontSize: typography.sizes.sm,
    color: colors.sparkle,
  },
  toggleRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  togglePill: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
  },
  toggleSelected: {
    backgroundColor: colors.warmCtaStart,
  },
  toggleUnselected: {
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.36)',
  },
  toggleText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
  },
  toggleTextSelected: {
    color: colors.textInverse,
  },
  toggleTextUnselected: {
    color: colors.textInverse,
  },
  heroStatCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    marginBottom: spacing.sm,
    borderWidth: 1.2,
    borderColor: colors.accentBorder,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.16,
    shadowRadius: 22,
    elevation: 5,
  },
  heroStatLeft: {
    flex: 1,
  },
  heroStatLabel: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fonts.ui,
    fontWeight: typography.weights.semibold,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: colors.textSecondary,
    marginBottom: 6,
  },
  heroStatValue: {
    fontSize: 52,
    fontWeight: typography.weights.bold,
    color: colors.text,
    letterSpacing: -1.5,
    lineHeight: 56,
  },
  heroStatSub: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.accent,
    marginTop: 4,
  },
  heroStatIconWrap: {
    width: 60,
    height: 60,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.md,
    backgroundColor: colors.accentLight,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    borderWidth: 1.2,
    borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
  },
  statValue: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  statLabel: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  sectionHeader: {
    fontSize: typography.sizes.lg,
    fontFamily: typography.fonts.ui,
    color: colors.primaryDark,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  chartContainer: {
    marginTop: spacing.sm,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.card,
    borderWidth: 1.2,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.md,
    overflow: 'hidden',
  },
  axisText: {
    fontSize: 10,
    color: colors.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1.2,
    borderColor: colors.border,
    borderRadius: radius.card,
  },
  standaloneCardWrap: {
    marginTop: spacing.lg,
  },
  reportsList: {
    gap: spacing.sm,
  },
  patternList: {
    gap: spacing.sm,
  },
  patternCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1.2,
    borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
  },
  patternIcon: {},
  patternText: {
    fontSize: typography.sizes.body,
    color: colors.text,
    flex: 1,
  },
  patternHint: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: spacing.md,
  },
  aiReportCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1.2,
    borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
  },
  aiReportIcon: {},
  aiReportInfo: {
    flex: 1,
  },
  aiReportTitle: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
    color: colors.text,
  },
  aiReportSubtitle: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  proLockCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1.2,
    borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
  },
  proLockIcon: {},
  proLockInfo: {
    flex: 1,
  },
  proLockTitle: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
    color: colors.text,
  },
  proLockSubtitle: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  proLockBadge: {
    backgroundColor: colors.pink,
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  proLockBadgeText: {
    fontSize: typography.sizes.xs,
    color: colors.textInverse,
    fontWeight: typography.weights.semibold,
  },
});

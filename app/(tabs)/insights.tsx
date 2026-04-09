import React, { useState, useMemo } from 'react';
import { View, Text, Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Screen, Card } from '@components/index';
import { SparkleOverlay } from '@components/SparkleOverlay';
import { useMoodEntryStore, useSessionStore } from '@store/index';
import { filterEntriesByDays, getMoodFrequency, getDailyMoodScores, GROUP_SCORES } from '@lib/insights';
import { detectPatterns } from '@lib/patterns';
import { BarChart, LineChart } from 'react-native-gifted-charts';
import { colors, typography, spacing, radius } from '@constants/theme';
import { MOOD_MAP } from '@constants/moods';
import type { MoodSlot } from '@models/index';

type Period = 7 | 30;

export default function InsightsScreen() {
  const [period, setPeriod] = useState<Period>(7);
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();
  const chartWidth = screenWidth - spacing.screenPadding * 2 - 40;

  const entries = useMoodEntryStore((s) => s.entries);
  const session = useSessionStore((s) => s.session);
  const isPro = session?.subscriptionStatus === 'trial' || session?.subscriptionStatus === 'active';

  const filtered = useMemo(
    () => filterEntriesByDays(entries, period),
    [entries, period],
  );

  const frequency = useMemo(() => getMoodFrequency(filtered), [filtered]);
  const dailyScores = useMemo(() => getDailyMoodScores(filtered), [filtered]);
  const patterns = useMemo(() => detectPatterns(filtered), [filtered]);
  const totalEntries = filtered.length;

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
    () =>
      dailyScores.map((item, index) => ({
        value: item.score,
        label: period === 30 ? (index % 5 === 0 ? item.label : '') : item.label,
        labelTextStyle: { fontSize: 9, color: colors.textSecondary },
      })),
    [dailyScores, period],
  );

  if (filtered.length === 0) {
    return (
      <Screen scrollable={true}>
        <LinearGradient
          colors={[colors.skyStart, colors.skyEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <SparkleOverlay />
          <Text style={styles.screenTitle} accessibilityRole="header">
            Insights
          </Text>
          <Text style={styles.heroSubtitle}>Track your mood patterns over time</Text>
          <PeriodToggle period={period} onSelect={setPeriod} />
        </LinearGradient>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>No moods logged yet</Text>
          <Text style={styles.emptySubtitle}>
            Start checking in to see your patterns here
          </Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen scrollable={true}>
      <LinearGradient
        colors={[colors.skyStart, colors.skyEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroCard}
      >
        <SparkleOverlay count={20} />
        <View style={styles.badgeRow}>
          <Ionicons name="sparkles" size={12} color={colors.textInverse} />
          <Text style={styles.badgeText}>Mood Story</Text>
        </View>
        <Text style={styles.screenTitle} accessibilityRole="header">
          Insights
        </Text>
        <Text style={styles.heroSubtitle}>Track your mood patterns over time</Text>
        <PeriodToggle period={period} onSelect={setPeriod} />
      </LinearGradient>

      <View style={styles.statsRow}>
        <Card style={styles.statCard}>
          <Text
            style={styles.statValue}
            accessibilityLabel={`${streak} day streak`}
          >
            {streak}
          </Text>
          <Text style={styles.statLabel}>day streak</Text>
        </Card>
        <Card style={styles.statCard}>
          <Text
            style={styles.statValue}
            accessibilityLabel={`${totalEntries} check-ins`}
          >
            {totalEntries}
          </Text>
          <Text style={styles.statLabel}>check-ins</Text>
        </Card>
      </View>

      {frequency.length > 0 && (
        <View>
          <Text style={styles.sectionHeader} accessibilityRole="header">
            Top moods
          </Text>
          <View
            style={styles.chartContainer}
            accessibilityLabel={`Mood frequency chart showing top ${Math.min(frequency.length, 6)} moods`}
          >
            <BarChart
              data={barData}
              width={chartWidth}
              barWidth={32}
              spacing={16}
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
      )}

      {dailyScores.length > 1 && (
        <View>
          <Text style={styles.sectionHeader} accessibilityRole="header">
            Mood trend
          </Text>
          <View
            style={styles.chartContainer}
            accessibilityLabel={`Mood trend line chart over ${period} days`}
          >
            <LineChart
              data={lineData}
              width={chartWidth}
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
      )}

      {patterns.length > 0 && (
        <View>
          <Text style={styles.sectionHeader} accessibilityRole="header">
            Patterns
          </Text>
          {patterns.map((p) => (
            <View key={p.id} accessibilityLabel={p.text}>
              <Card style={styles.patternCard}>
                <Text style={styles.patternIcon}>{p.icon}</Text>
                <Text style={styles.patternText}>{p.text}</Text>
              </Card>
            </View>
          ))}
        </View>
      )}

      {filtered.length > 0 && filtered.length < 7 && patterns.length === 0 && (
        <View>
          <Text style={styles.sectionHeader} accessibilityRole="header">
            Patterns
          </Text>
          <Text style={styles.patternHint}>Log more check-ins to see patterns</Text>
        </View>
      )}

      {/* Correlations — Pro feature */}
      {filtered.length > 0 && (
        <View>
          <Text style={styles.sectionHeader} accessibilityRole="header">
            Correlations
          </Text>
          {isPro ? (
            <CorrelationHeatmap matrix={correlationMatrix} />
          ) : (
            <Pressable
              onPress={() => router.push('/paywall')}
              accessibilityRole="button"
              accessibilityLabel="Upgrade to Pro to unlock Correlation Insights"
            >
              <Card style={styles.proLockCard}>
                <Text style={styles.proLockIcon}>🔍</Text>
                <View style={styles.proLockInfo}>
                  <Text style={styles.proLockTitle}>Correlation Insights</Text>
                  <Text style={styles.proLockSubtitle}>
                    See which times and days you feel best. Pro feature.
                  </Text>
                </View>
                <View style={styles.proLockBadge}>
                  <Text style={styles.proLockBadgeText}>Pro</Text>
                </View>
              </Card>
            </Pressable>
          )}
        </View>
      )}

      {filtered.length > 0 && (
        <View>
          <Text style={styles.sectionHeader} accessibilityRole="header">
            AI Report
          </Text>
          <Pressable
            onPress={() => router.push('/ai-report')}
            accessibilityRole="button"
            accessibilityLabel="View AI Report — get personalised mood insights"
          >
            <Card style={styles.aiReportCard}>
              <Text style={styles.aiReportIcon}>{'\u2728'}</Text>
              <View style={styles.aiReportInfo}>
                <Text style={styles.aiReportTitle}>Personalised insights</Text>
                <Text style={styles.aiReportSubtitle}>Weekly and monthly AI mood analysis</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
            </Card>
          </Pressable>
        </View>
      )}
    </Screen>
  );
}

// ─── Correlation Heatmap ──────────────────────────────────────────────────────

const DOW_ORDER = [1, 2, 3, 4, 5, 6, 0]; // Mon...Sun
const DOW_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

const SLOT_ORDER: MoodSlot[] = ['morning', 'afternoon', 'night', 'pre_sleep'];
const SLOT_SHORT: Record<MoodSlot, string> = {
  morning: 'Morn',
  afternoon: 'Aftn',
  night: 'Eve',
  pre_sleep: 'Night',
};

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
  return (
    <View
      style={heatmapStyles.container}
      accessibilityLabel="Correlation heatmap showing average mood by time-of-day and day-of-week"
    >
      {/* Column headers */}
      <View style={heatmapStyles.row}>
        <View style={heatmapStyles.rowLabel} />
        {DOW_LABELS.map((label, i) => (
          <View key={i} style={heatmapStyles.cell}>
            <Text style={heatmapStyles.colLabel}>{label}</Text>
          </View>
        ))}
      </View>
      {/* Data rows */}
      {SLOT_ORDER.map((slot) => (
        <View key={slot} style={heatmapStyles.row}>
          <View style={heatmapStyles.rowLabel}>
            <Text style={heatmapStyles.rowLabelText}>{SLOT_SHORT[slot]}</Text>
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
                  accessibilityLabel={avg !== null ? `score ${avg.toFixed(1)}` : 'no data'}
                />
              </View>
            );
          })}
        </View>
      ))}
      {/* Legend */}
      <View style={heatmapStyles.legend}>
        {[
          { color: '#EF5350', label: 'Low' },
          { color: '#FFD54F', label: 'Mixed' },
          { color: '#80DEEA', label: 'Good' },
          { color: '#66BB6A', label: 'Great' },
          { color: '#F0F0F0', label: 'No data' },
        ].map(({ color, label }) => (
          <View key={label} style={heatmapStyles.legendItem}>
            <View style={[heatmapStyles.legendDot, { backgroundColor: color }]} />
            <Text style={heatmapStyles.legendLabel}>{label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const heatmapStyles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderRadius: 22,
    borderWidth: 1.2,
    borderColor: '#DCE9FF',
    padding: spacing.md,
    gap: 4,
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

// ─── Period Toggle ────────────────────────────────────────────────────────────

function PeriodToggle({
  period,
  onSelect,
}: {
  period: Period;
  onSelect: (p: Period) => void;
}) {
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
            accessibilityLabel={`Show last ${p} days`}
          >
            <Text style={[styles.toggleText, selected ? styles.toggleTextSelected : styles.toggleTextUnselected]}>
              {p}d
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
    gap: spacing.sm,
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
    fontSize: typography.sizes.xxl,
    fontFamily: typography.fonts.display,
    color: colors.textInverse,
  },
  heroSubtitle: {
    fontSize: typography.sizes.body,
    color: colors.sparkle,
  },
  toggleRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
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
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    borderWidth: 1.2,
    borderColor: '#DCE9FF',
    backgroundColor: 'rgba(255,255,255,0.96)',
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
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderRadius: 22,
    borderWidth: 1.2,
    borderColor: '#DCE9FF',
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
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderWidth: 1.2,
    borderColor: '#DCE9FF',
    borderRadius: 22,
  },
  emptyTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  emptySubtitle: {
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  patternCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
    borderWidth: 1.2,
    borderColor: '#DCE9FF',
    backgroundColor: 'rgba(255,255,255,0.96)',
  },
  patternIcon: {
    fontSize: typography.sizes.lg,
  },
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
    borderColor: '#DCE9FF',
    backgroundColor: 'rgba(255,255,255,0.96)',
  },
  aiReportIcon: {
    fontSize: typography.sizes.xl,
  },
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
    borderColor: '#DCE9FF',
    backgroundColor: 'rgba(255,255,255,0.96)',
  },
  proLockIcon: {
    fontSize: typography.sizes.xl,
  },
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
    backgroundColor: colors.primary,
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

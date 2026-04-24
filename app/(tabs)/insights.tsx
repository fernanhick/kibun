import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, type LayoutChangeEvent } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Screen, Card } from '@components/index';
import { SparkleOverlay } from '@components/SparkleOverlay';
import { useMoodEntryStore, useSessionStore } from '@store/index';
import { useHabitsStore } from '@store/habitsStore';
import { filterEntriesByDays, getMoodFrequency, getDailyMoodScores, GROUP_SCORES } from '@lib/insights';
import { detectPatterns, calculateResilienceScore, type ResilienceResult } from '@lib/patterns';
import { BarChart, LineChart } from 'react-native-gifted-charts';
import { colors, typography, spacing, radius } from '@constants/theme';
import { MOOD_MAP } from '@constants/moods';
import type { MoodSlot, Habit, HabitLog, MoodEntry } from '@models/index';

type Period = 7 | 30;

export default function InsightsScreen() {
  const [period, setPeriod] = useState<Period>(7);
  const router = useRouter();
  // Charts must size against the actual rendered column (Screen clamps to a
  // tablet-friendly max-width), not the full window. Measured via onLayout
  // on each chart container; default keeps charts non-zero on first paint.
  const [chartContainerWidth, setChartContainerWidth] = useState(0);
  const handleChartLayout = useCallback((e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0 && w !== chartContainerWidth) setChartContainerWidth(w);
  }, [chartContainerWidth]);
  const chartWidth = chartContainerWidth > 0 ? Math.max(chartContainerWidth - 40, 200) : 280;

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
      <Screen scrollable={true} layout="wide">
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
    <Screen scrollable={true} layout="wide">
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
            onLayout={handleChartLayout}
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
            onLayout={handleChartLayout}
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

      {/* Resilience Score — Pro feature */}
      {filtered.length > 0 && (
        <View>
          <Text style={styles.sectionHeader} accessibilityRole="header">
            Resilience
          </Text>
          {isPro ? (
            <ResilienceCard current={resilienceCurrent} prior={resiliencePrior} />
          ) : (
            <Pressable
              onPress={() => router.push('/paywall')}
              accessibilityRole="button"
              accessibilityLabel="Upgrade to Pro to unlock Emotional Resilience Score"
            >
              <Card style={styles.proLockCard}>
                <Text style={styles.proLockIcon}>💪</Text>
                <View style={styles.proLockInfo}>
                  <Text style={styles.proLockTitle}>Emotional Resilience Score</Text>
                  <Text style={styles.proLockSubtitle}>
                    See how quickly you bounce back from difficult moods. Pro feature.
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

      {/* Habits × Mood — Pro feature */}
      {habits.length > 0 && filtered.length > 0 && (
        <View>
          <Text style={styles.sectionHeader} accessibilityRole="header">
            Habits &amp; Mood
          </Text>
          {isPro ? (
            habitCorrelations.length > 0 ? (
              <HabitCorrelationList correlations={habitCorrelations} />
            ) : (
              <Card style={styles.proLockCard}>
                <Text style={styles.proLockIcon}>📊</Text>
                <View style={styles.proLockInfo}>
                  <Text style={styles.proLockTitle}>Not enough data yet</Text>
                  <Text style={styles.proLockSubtitle}>
                    Log habits for at least 5 days to see correlations.
                  </Text>
                </View>
              </Card>
            )
          ) : (
            <Pressable
              onPress={() => router.push('/paywall')}
              accessibilityRole="button"
              accessibilityLabel="Upgrade to Pro to unlock Habit Correlations"
            >
              <Card style={styles.proLockCard}>
                <Text style={styles.proLockIcon}>📊</Text>
                <View style={styles.proLockInfo}>
                  <Text style={styles.proLockTitle}>Habit × Mood Correlations</Text>
                  <Text style={styles.proLockSubtitle}>
                    See which habits most influence your mood scores. Pro feature.
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

      {entries.length > 0 && (
        <View>
          <Text style={styles.sectionHeader} accessibilityRole="header">
            Year in Mood
          </Text>
          <Pressable
            onPress={() => router.push('/annual-report')}
            accessibilityRole="button"
            accessibilityLabel="View your Year in Mood annual report"
          >
            <Card style={styles.aiReportCard}>
              <Text style={styles.aiReportIcon}>🗓️</Text>
              <View style={styles.aiReportInfo}>
                <Text style={styles.aiReportTitle}>
                  {new Date().getFullYear()} in Mood
                </Text>
                <Text style={styles.aiReportSubtitle}>
                  Your yearly mood story with AI narrative
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
            </Card>
          </Pressable>
        </View>
      )}
    </Screen>
  );
}

// ─── Habit Correlation ───────────────────────────────────────────────────────

interface HabitCorrelation {
  habit: Habit;
  correlation: number;  // -1 to 1 (scale) or mean-diff normalized (boolean)
  label: string;
}

function strengthLabel(r: number): string {
  const abs = Math.abs(r);
  const dir = r >= 0 ? 'positive' : 'negative';
  if (abs >= 0.5) return `Strong ${dir}`;
  if (abs >= 0.3) return `Moderate ${dir}`;
  if (abs >= 0.1) return `Weak ${dir}`;
  return 'No clear link';
}

function pearsonCorrelation(xs: number[], ys: number[]): number {
  const n = xs.length;
  if (n < 2) return 0;
  const meanX = xs.reduce((a, b) => a + b, 0) / n;
  const meanY = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0, sdX = 0, sdY = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - meanX) * (ys[i] - meanY);
    sdX += (xs[i] - meanX) ** 2;
    sdY += (ys[i] - meanY) ** 2;
  }
  const denom = Math.sqrt(sdX * sdY);
  return denom === 0 ? 0 : num / denom;
}

function computeHabitCorrelations(
  habits: Habit[],
  logs: HabitLog[],
  entries: MoodEntry[],
): HabitCorrelation[] {
  // Build daily average mood score map
  const dailyMood: Record<string, number[]> = {};
  for (const e of entries) {
    const date = e.loggedAt.split('T')[0];
    const mood = MOOD_MAP[e.moodId as keyof typeof MOOD_MAP];
    const score = mood ? GROUP_SCORES[mood.group] : 3;
    if (!dailyMood[date]) dailyMood[date] = [];
    dailyMood[date].push(score);
  }
  const dailyAvg: Record<string, number> = {};
  for (const [date, scores] of Object.entries(dailyMood)) {
    dailyAvg[date] = scores.reduce((a, b) => a + b, 0) / scores.length;
  }

  const result: HabitCorrelation[] = [];

  for (const habit of habits) {
    const hLogs = logs.filter((l) => l.habitId === habit.id && dailyAvg[l.logDate] !== undefined);
    if (hLogs.length < 5) continue;

    let r: number;
    if (habit.trackingType === 'scale') {
      r = pearsonCorrelation(hLogs.map((l) => l.value), hLogs.map((l) => dailyAvg[l.logDate]));
    } else {
      // boolean: normalise mean-diff to -1..1 range (scale 0–4)
      const doneMean = hLogs.filter((l) => l.value === 1).map((l) => dailyAvg[l.logDate]);
      const skipMean = hLogs.filter((l) => l.value === 0).map((l) => dailyAvg[l.logDate]);
      if (doneMean.length < 3) continue;
      const avgDone = doneMean.reduce((a, b) => a + b, 0) / doneMean.length;
      const avgSkip = skipMean.length > 0
        ? skipMean.reduce((a, b) => a + b, 0) / skipMean.length
        : Object.values(dailyAvg).reduce((a, b) => a + b, 0) / Object.values(dailyAvg).length;
      r = (avgDone - avgSkip) / 3;
    }

    result.push({ habit, correlation: r, label: strengthLabel(r) });
  }

  return result.sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation));
}

function correlationColor(r: number): string {
  const abs = Math.abs(r);
  if (abs >= 0.5) return r >= 0 ? '#66BB6A' : '#EF5350';
  if (abs >= 0.3) return r >= 0 ? '#AED581' : '#FF8A65';
  if (abs >= 0.1) return r >= 0 ? '#80DEEA' : '#FFD54F';
  return '#BDBDBD';
}

function HabitCorrelationList({ correlations }: { correlations: HabitCorrelation[] }) {
  return (
    <View style={corrStyles.container}>
      {correlations.map(({ habit, correlation, label }) => {
        const barWidth = Math.abs(correlation) * 100;
        const color = correlationColor(correlation);
        return (
          <View
            key={habit.id}
            style={corrStyles.row}
            accessibilityLabel={`${habit.name}: ${label}`}
          >
            <Text style={corrStyles.icon}>{habit.icon}</Text>
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

const corrStyles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderWidth: 1.2,
    borderColor: '#DCE9FF',
    borderRadius: 22,
    padding: spacing.md,
    gap: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  icon: {
    fontSize: 20,
    width: 28,
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
  if (!current) {
    return (
      <Card style={resilienceStyles.container}>
        <Text style={resilienceStyles.emptyText}>
          Log more moods — including some difficult ones — to see your resilience score.
        </Text>
      </Card>
    );
  }

  const trendDiff = prior ? current.score - prior.score : null;
  const trendArrow = trendDiff === null ? null : trendDiff > 5 ? '↑' : trendDiff < -5 ? '↓' : '→';
  const trendColor = trendDiff === null ? colors.textSecondary : trendDiff > 5 ? '#66BB6A' : trendDiff < -5 ? '#EF5350' : colors.textSecondary;

  const avgHoursDisplay =
    current.avgHours < 1
      ? `${Math.round(current.avgHours * 60)}m avg recovery`
      : current.avgHours < 24
      ? `${Math.round(current.avgHours)}h avg recovery`
      : `${(current.avgHours / 24).toFixed(1)}d avg recovery`;

  return (
    <Card
      style={resilienceStyles.container}
      accessibilityLabel={`Emotional resilience score: ${current.score} out of 100`}
    >
      <View style={resilienceStyles.scoreRow}>
        <View>
          <View style={resilienceStyles.scoreLine}>
            <Text style={[resilienceStyles.scoreValue, { color: scoreToResilienceColor(current.score) }]}>
              {current.score}
            </Text>
            <Text style={resilienceStyles.scoreMax}>/100</Text>
            {trendArrow && (
              <Text style={[resilienceStyles.trendArrow, { color: trendColor }]}>{trendArrow}</Text>
            )}
          </View>
          <Text style={resilienceStyles.scoreLabel}>Emotional Resilience</Text>
        </View>
        <Text style={resilienceStyles.icon}>💪</Text>
      </View>
      <Text style={resilienceStyles.detail}>
        {avgHoursDisplay} · based on {current.recoveries} {current.recoveries === 1 ? 'recovery' : 'recoveries'}
      </Text>
      <View style={resilienceStyles.barTrack}>
        <View style={[resilienceStyles.barFill, { width: `${current.score}%` as any, backgroundColor: scoreToResilienceColor(current.score) }]} />
      </View>
    </Card>
  );
}

const resilienceStyles = StyleSheet.create({
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
    fontSize: typography.sizes.lg,
    fontWeight: '700',
    marginLeft: 4,
  },
  scoreLabel: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  icon: {
    fontSize: 28,
  },
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

import React, { useState, useMemo } from 'react';
import { View, Text, Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Card } from '@components/index';
import { useMoodEntryStore } from '@store/index';
import { filterEntriesByDays, getMoodFrequency, getDailyMoodScores } from '@lib/insights';
import { detectPatterns } from '@lib/patterns';
import { BarChart, LineChart } from 'react-native-gifted-charts';
import { colors, typography, spacing, radius } from '@constants/theme';

type Period = 7 | 30;

export default function InsightsScreen() {
  const [period, setPeriod] = useState<Period>(7);
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();
  const chartWidth = screenWidth - spacing.screenPadding * 2 - 40;

  const entries = useMoodEntryStore((s) => s.entries);

  const filtered = useMemo(
    () => filterEntriesByDays(entries, period),
    [entries, period],
  );

  const frequency = useMemo(() => getMoodFrequency(filtered), [filtered]);
  const dailyScores = useMemo(() => getDailyMoodScores(filtered), [filtered]);
  const patterns = useMemo(() => detectPatterns(filtered), [filtered]);
  const totalEntries = filtered.length;

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
        <Text style={styles.screenTitle} accessibilityRole="header">
          Insights
        </Text>
        <PeriodToggle period={period} onSelect={setPeriod} />
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
      <Text style={styles.screenTitle} accessibilityRole="header">
        Insights
      </Text>

      <PeriodToggle period={period} onSelect={setPeriod} />

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
  screenTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.text,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  toggleRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  togglePill: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
  },
  toggleSelected: {
    backgroundColor: colors.primary,
  },
  toggleUnselected: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  toggleText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
  },
  toggleTextSelected: {
    color: colors.textInverse,
  },
  toggleTextUnselected: {
    color: colors.text,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
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
    fontWeight: typography.weights.semibold,
    color: colors.text,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  chartContainer: {
    marginTop: spacing.sm,
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
});

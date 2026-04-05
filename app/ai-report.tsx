import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Card, Button } from '@components/index';
import { useSessionStore } from '@store/sessionStore';
import { useOnboardingStore } from '@store/onboardingStore';
import { requestReport, getLatestReport } from '@lib/aiReports';
import type { AIReport } from '@models/index';
import { colors, typography, spacing, radius } from '@constants/theme';

type ReportType = 'weekly' | 'monthly';
type ScreenState = 'loading' | 'no-report' | 'generating' | 'has-report' | 'error';

export default function AIReportScreen() {
  const router = useRouter();
  const session = useSessionStore((s) => s.session);
  const profile = useOnboardingStore((s) => s.profile);

  const [reportType, setReportType] = useState<ReportType>('weekly');
  const [report, setReport] = useState<AIReport | null>(null);
  const [screenState, setScreenState] = useState<ScreenState>('loading');

  const userId = session?.userId ?? '';
  const isSubscribed =
    session?.subscriptionStatus === 'trial' ||
    session?.subscriptionStatus === 'active';

  const loadReport = useCallback(async () => {
    if (!isSubscribed || !userId) return;
    setScreenState('loading');
    try {
      const existing = await getLatestReport(userId, reportType);
      if (existing) {
        setReport(existing);
        setScreenState('has-report');
      } else {
        setReport(null);
        setScreenState('no-report');
      }
    } catch (err) {
      if (__DEV__) {
        console.error('[kibun:aiReport] loadReport failed:', err);
      }
      setScreenState('error');
    }
  }, [userId, reportType, isSubscribed]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const handleGenerate = useCallback(async () => {
    setScreenState('generating');
    const generated = await requestReport({ reportType, profile });
    if (generated) {
      setReport(generated);
      setScreenState('has-report');
    } else {
      setScreenState('error');
    }
  }, [reportType, profile]);

  // ── Locked state ──────────────────────────────────────────────────────────
  if (!isSubscribed) {
    return (
      <Screen scrollable={false}>
        <ScreenHeader onBack={() => router.back()} />
        <View style={styles.lockedContainer}>
          <Ionicons
            name="lock-closed-outline"
            size={48}
            color={colors.textSecondary}
            accessibilityElementsHidden
          />
          <Text style={styles.lockedTitle}>Premium feature</Text>
          <Text style={styles.lockedSubtitle}>
            Get personalised weekly and monthly mood insights powered by AI
          </Text>
          <Button
            label="Start free trial"
            onPress={() => router.push('/paywall')}
          />
        </View>
      </Screen>
    );
  }

  // ── Subscribed — report type toggle always visible ─────────────────────
  return (
    <Screen scrollable={true}>
      <ScreenHeader onBack={() => router.back()} />
      <ReportTypeToggle
        selected={reportType}
        onSelect={(t) => { setReportType(t); }}
      />
      <ReportBody
        state={screenState}
        report={report}
        reportType={reportType}
        onGenerate={handleGenerate}
        onRetry={loadReport}
      />
    </Screen>
  );
}

// ── Sub-components ───────────────────────────────────────────────────────────

function ScreenHeader({ onBack }: { onBack: () => void }) {
  return (
    <View style={styles.header}>
      <Pressable
        onPress={onBack}
        accessibilityLabel="Go back"
        accessibilityRole="button"
        hitSlop={12}
      >
        <Ionicons name="chevron-back" size={24} color={colors.text} />
      </Pressable>
      <Text style={styles.headerTitle} accessibilityRole="header">
        AI Report
      </Text>
    </View>
  );
}

function ReportTypeToggle({
  selected,
  onSelect,
}: {
  selected: ReportType;
  onSelect: (t: ReportType) => void;
}) {
  return (
    <View style={styles.toggleRow}>
      {(['weekly', 'monthly'] as ReportType[]).map((t) => {
        const isSelected = selected === t;
        return (
          <Pressable
            key={t}
            onPress={() => onSelect(t)}
            style={[styles.togglePill, isSelected ? styles.toggleSelected : styles.toggleUnselected]}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
            accessibilityLabel={`${t === 'weekly' ? 'Weekly' : 'Monthly'} report`}
          >
            <Text style={[styles.toggleText, isSelected ? styles.toggleTextSelected : styles.toggleTextUnselected]}>
              {t === 'weekly' ? 'Weekly' : 'Monthly'}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function ReportBody({
  state,
  report,
  reportType,
  onGenerate,
  onRetry,
}: {
  state: ScreenState;
  report: AIReport | null;
  reportType: ReportType;
  onGenerate: () => void;
  onRetry: () => void;
}) {
  if (state === 'loading') {
    return (
      <View style={styles.centeredState}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (state === 'generating') {
    return (
      <View style={styles.centeredState}>
        {/* accessibilityLiveRegion must be on View, not Text — TextProps does not include this prop */}
        <View accessibilityLiveRegion="polite">
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.generatingText}>
            Analysing your mood patterns...
          </Text>
        </View>
      </View>
    );
  }

  if (state === 'error') {
    return (
      <View style={styles.centeredState}>
        <Text style={styles.errorTitle}>Could not load report</Text>
        <Text style={styles.errorSubtitle}>Check your connection and try again</Text>
        <Button label="Try again" onPress={onRetry} />
      </View>
    );
  }

  if (state === 'no-report') {
    return (
      <View style={styles.centeredState}>
        <Text style={styles.emptyIcon} accessibilityElementsHidden>
          {'\u2728'}
        </Text>
        <Text style={styles.emptyTitle}>No {reportType} report yet</Text>
        <Text style={styles.emptySubtitle}>
          Generate your first {reportType} mood analysis
        </Text>
        <Button label="Generate my report" onPress={onGenerate} />
      </View>
    );
  }

  // state === 'has-report'
  if (!report) return null;

  const periodLabel = formatPeriodLabel(report.periodStart, report.periodEnd);
  const generatedLabel = formatRelativeDate(report.createdAt);
  const summary = report.moodSummary;

  return (
    <View style={styles.reportContainer}>
      <Text
        style={styles.periodLabel}
        accessibilityLabel={`Report period: ${periodLabel}`}
      >
        {periodLabel}
      </Text>

      <Card style={styles.contentCard}>
        {/* No accessibilityLabel needed — Text content is self-describing */}
        <Text style={styles.contentText}>
          {report.content}
        </Text>
      </Card>

      {summary && (
        <View>
          <Text style={styles.sectionHeader} accessibilityRole="header">
            Mood summary
          </Text>
          <View style={styles.statsRow}>
            <Card style={styles.statCard}>
              <Text
                style={styles.statValue}
                accessibilityLabel={`${summary.totalEntries} check-ins`}
              >
                {summary.totalEntries}
              </Text>
              <Text style={styles.statLabel}>check-ins</Text>
            </Card>
            <Card style={styles.statCard}>
              <Text
                style={styles.statValue}
                accessibilityLabel={`${summary.avgEntriesPerDay} per day average`}
              >
                {summary.avgEntriesPerDay}
              </Text>
              <Text style={styles.statLabel}>per day avg</Text>
            </Card>
          </View>

          {summary.topMoods.length > 0 && (
            <View style={styles.topMoodsRow}>
              {summary.topMoods.map(({ moodId, count }) => (
                <View
                  key={moodId}
                  style={styles.moodChip}
                  accessibilityLabel={`${moodId}, ${count} times`}
                >
                  <Text style={styles.moodChipText}>{moodId}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      <Text style={styles.generatedLabel}>Generated {generatedLabel}</Text>

      <Button label="Generate new report" onPress={onGenerate} />
    </View>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatPeriodLabel(start: string, end: string): string {
  const s = new Date(start + 'T12:00:00');
  const e = new Date(end + 'T12:00:00');
  const monthFmt = new Intl.DateTimeFormat(undefined, { month: 'long' });
  if (s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear()) {
    return `${monthFmt.format(s)} ${s.getDate()}\u2013${e.getDate()}`;
  }
  const dayFmt = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' });
  return `${dayFmt.format(s)}\u2013${dayFmt.format(e)}`;
}

function formatRelativeDate(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  headerTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.text,
    flex: 1,
  },
  toggleRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
  },
  togglePill: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
  },
  toggleSelected: { backgroundColor: colors.primary },
  toggleUnselected: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  toggleText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
  },
  toggleTextSelected: { color: colors.textInverse },
  toggleTextUnselected: { color: colors.text },
  lockedContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  lockedTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.text,
    textAlign: 'center',
  },
  lockedSubtitle: {
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: typography.sizes.md * typography.lineHeights.relaxed,
  },
  centeredState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
    paddingVertical: spacing.xxl,
  },
  generatingText: {
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  errorTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    color: colors.text,
    textAlign: 'center',
  },
  errorSubtitle: {
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  emptyIcon: { fontSize: 48 },
  emptyTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.text,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: typography.sizes.md * typography.lineHeights.relaxed,
  },
  reportContainer: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  periodLabel: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    fontWeight: typography.weights.medium,
    marginBottom: spacing.xs,
  },
  contentCard: { padding: spacing.md },
  contentText: {
    fontSize: typography.sizes.body,
    color: colors.text,
    lineHeight: typography.sizes.body * typography.lineHeights.relaxed,
  },
  sectionHeader: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    color: colors.text,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  statsRow: { flexDirection: 'row', gap: spacing.sm },
  statCard: { flex: 1, alignItems: 'center' },
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
  topMoodsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  moodChip: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.full,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  moodChipText: {
    fontSize: typography.sizes.sm,
    color: colors.text,
    fontWeight: typography.weights.medium,
  },
  generatedLabel: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});

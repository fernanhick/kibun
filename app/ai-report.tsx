import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import Markdown from 'react-native-markdown-display';
import { Screen, Card, Button, BackButton } from '@components/index';
import { useSessionStore } from '@store/sessionStore';
import { useOnboardingStore } from '@store/onboardingStore';
import { requestReport, getLatestReport } from '@lib/aiReports';
import type { AIReport, AIReportStructured, AIReportTone } from '@models/index';
import { typography, spacing, radius } from '@constants/theme';
import { useTheme, type ThemePalette } from '@theme/ThemeContext';
import { useThemedStyles } from '@hooks/useThemedStyles';

type ReportType = 'weekly' | 'monthly';
type ScreenState = 'loading' | 'no-report' | 'generating' | 'has-report' | 'error' | 'no-entries' | 'subscription-error';

export default function AIReportScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const { t } = useTranslation('screens');
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
    const result = await requestReport({ reportType, profile });
    if (result.ok) {
      setReport(result.report);
      setScreenState('has-report');
    } else if (result.reason === 'no_entries') {
      setScreenState('no-entries');
    } else if (result.reason === 'subscription_required') {
      setScreenState('subscription-error');
    } else {
      setScreenState('error');
    }
  }, [reportType, profile]);

  // ── Locked state ──────────────────────────────────────────────────────────
  if (!isSubscribed) {
    return (
      <Screen scrollable={false} layout="wide">
        <ScreenHeader />
        <View style={styles.lockedContainer}>
          <Ionicons
            name="lock-closed-outline"
            size={48}
            color={colors.textSecondary}
            accessibilityElementsHidden
          />
          <Text style={styles.lockedTitle}>{t('aiReport.premiumTitle')}</Text>
          <Text style={styles.lockedSubtitle}>
            {t('aiReport.premiumSubtitle')}
          </Text>
          <Button
            label={t('aiReport.startTrial')}
            onPress={() => router.push('/paywall')}
          />
        </View>
      </Screen>
    );
  }

  // ── Subscribed — report type toggle always visible ─────────────────────
  return (
    <Screen scrollable={true} layout="wide">
      <ScreenHeader />
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

function ScreenHeader() {
  const styles = useThemedStyles(createStyles);
  const { t } = useTranslation('screens');
  return (
    <View style={styles.header}>
      <BackButton />
      <Text style={styles.headerTitle} accessibilityRole="header">
        {t('aiReport.title')}
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
  const { t: i18nT } = useTranslation('screens');
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.toggleRow}>
      {(['weekly', 'monthly'] as ReportType[]).map((period) => {
        const isSelected = selected === period;
        const label = period === 'weekly' ? i18nT('aiReport.weekly') : i18nT('aiReport.monthly');
        return (
          <Pressable
            key={period}
            onPress={() => onSelect(period)}
            style={[styles.togglePill, isSelected ? styles.toggleSelected : styles.toggleUnselected]}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
            accessibilityLabel={i18nT('aiReport.reportTypeA11y', { label })}
          >
            <Text style={[styles.toggleText, isSelected ? styles.toggleTextSelected : styles.toggleTextUnselected]}>
              {label}
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
  const { t } = useTranslation(['screens', 'moods']);
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  const periodName = reportType === 'weekly' ? t('aiReport.weekly') : t('aiReport.monthly');

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
            {t('aiReport.generating')}
          </Text>
        </View>
      </View>
    );
  }

  if (state === 'error') {
    return (
      <View style={styles.centeredState}>
        <Text style={styles.errorTitle}>{t('aiReport.loadErrorTitle')}</Text>
        <Text style={styles.errorSubtitle}>{t('aiReport.loadErrorSubtitle')}</Text>
        <Button label={t('aiReport.tryAgain')} onPress={onRetry} />
      </View>
    );
  }

  if (state === 'no-entries') {
    return (
      <View style={styles.centeredState}>
        <Ionicons name="calendar-outline" size={48} color={colors.textDisabled} style={styles.emptyIcon} />
        <Text style={styles.emptyTitle}>{t('aiReport.notEnoughData')}</Text>
        <Text style={styles.emptySubtitle}>
          {t('aiReport.noEntriesSubtitle')}
        </Text>
      </View>
    );
  }

  if (state === 'subscription-error') {
    return (
      <View style={styles.centeredState}>
        <Text style={styles.errorTitle}>{t('aiReport.subscriptionErrorTitle')}</Text>
        <Text style={styles.errorSubtitle}>
          {t('aiReport.subscriptionErrorSubtitle')}
        </Text>
        <Button label={t('aiReport.tryAgain')} onPress={onRetry} />
      </View>
    );
  }

  if (state === 'no-report') {
    return (
      <View style={styles.centeredState}>
        <Ionicons name="sparkles" size={48} color={colors.primary} style={styles.emptyIcon} />
        <Text style={styles.emptyTitle}>{t('aiReport.noReportYet', { period: periodName })}</Text>
        <Text style={styles.emptySubtitle}>
          {t('aiReport.noReportSubtitle', { period: periodName })}
        </Text>
        <Button label={t('aiReport.generateMyReport')} onPress={onGenerate} />
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
        accessibilityLabel={t('aiReport.periodA11y', { period: periodLabel })}
      >
        {periodLabel}
      </Text>

      <ReportContent report={report} />

      {summary && (
        <View>
          <Text style={styles.sectionHeader} accessibilityRole="header">
            {t('aiReport.moodSummary')}
          </Text>
          <View style={styles.statsRow}>
            <Card style={styles.statCard}>
              <Text
                style={styles.statValue}
                accessibilityLabel={t('aiReport.checkInsA11y', { count: summary.totalEntries })}
              >
                {summary.totalEntries}
              </Text>
              <Text style={styles.statLabel}>{t('aiReport.checkIns')}</Text>
            </Card>
            <Card style={styles.statCard}>
              <Text
                style={styles.statValue}
                accessibilityLabel={t('aiReport.perDayA11y', { value: summary.avgEntriesPerDay })}
              >
                {summary.avgEntriesPerDay}
              </Text>
              <Text style={styles.statLabel}>{t('aiReport.perDayAvg')}</Text>
            </Card>
          </View>

          {summary.topMoods.length > 0 && (
            <View style={styles.topMoodsRow}>
              {summary.topMoods.map(({ moodId, count }) => {
                const moodLabel = t(`moods:${moodId}.label`, { defaultValue: moodId });
                return (
                  <View
                    key={moodId}
                    style={styles.moodChip}
                    accessibilityLabel={t('aiReport.moodTimesA11y', { moodId: moodLabel, count })}
                  >
                    <Text style={styles.moodChipText}>{moodLabel}</Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      )}

      <Text style={styles.generatedLabel}>{t('aiReport.generated', { date: generatedLabel })}</Text>

      <Button label={t('aiReport.generateNewReport')} onPress={onGenerate} />
    </View>
  );
}

// ── Report content (structured → markdown → plain text) ─────────────────────

function ReportContent({ report }: { report: AIReport }) {
  const styles = useThemedStyles(createStyles);
  if (report.structured) {
    return <StructuredReport data={report.structured} />;
  }
  if (looksLikeMarkdown(report.content)) {
    return <MarkdownReport content={report.content} />;
  }
  return (
    <Card style={styles.contentCard}>
      <Text style={styles.contentText}>{report.content}</Text>
    </Card>
  );
}

function StructuredReport({ data }: { data: AIReportStructured }) {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  const { t } = useTranslation('screens');
  return (
    <View style={styles.structuredContainer}>
      {data.headline ? (
        <Text style={styles.headline} accessibilityRole="header">
          {data.headline}
        </Text>
      ) : null}

      <ToneChip tone={data.tone} />

      <Card style={styles.summaryCard}>
        <Text style={styles.summaryText}>{data.summary}</Text>
      </Card>

      {data.patterns.length > 0 && (
        <View style={styles.patternsSection}>
          <Text style={styles.sectionHeader} accessibilityRole="header">
            {t('aiReport.patterns')}
          </Text>
          <Card style={styles.patternsCard} padding="md">
            {data.patterns.map((p, i) => (
              <View
                key={i}
                style={[styles.patternRow, i === 0 ? null : styles.patternRowDivider]}
              >
                <View style={styles.patternBullet} />
                <Text style={styles.patternText}>{p}</Text>
              </View>
            ))}
          </Card>
        </View>
      )}

      {data.highlight && (
        <View style={styles.highlightCard} accessibilityRole="summary">
          <View style={styles.highlightIconWrap}>
            <Ionicons name="sparkles" size={14} color={colors.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.highlightLabel}>{data.highlight.label}</Text>
            <Text style={styles.highlightDetail}>{data.highlight.detail}</Text>
          </View>
        </View>
      )}

      <View style={styles.nudgeCard}>
        <View style={styles.nudgeHeaderRow}>
          <Ionicons name="leaf-outline" size={16} color={colors.primary} />
          <Text style={styles.nudgeTitle}>{data.nudge.title}</Text>
        </View>
        <Text style={styles.nudgeBody}>{data.nudge.body}</Text>
      </View>
    </View>
  );
}

function MarkdownReport({ content }: { content: string }) {
  const styles = useThemedStyles(createStyles);
  const markdownStyles = useThemedStyles(createMarkdownStyles);
  return (
    <Card style={styles.contentCard}>
      <Markdown style={markdownStyles}>{content}</Markdown>
    </Card>
  );
}

function ToneChip({ tone }: { tone: AIReportTone }) {
  const { t } = useTranslation('screens');
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const meta = getToneMeta(colors)[tone];
  return (
    <View style={[styles.toneChip, { backgroundColor: meta.bg, borderColor: meta.border }]}>
      <Text style={[styles.toneChipText, { color: meta.text }]}>{t(meta.labelKey)}</Text>
    </View>
  );
}

const getToneMeta = (colors: ThemePalette): Record<AIReportTone, { labelKey: string; bg: string; border: string; text: string }> => ({
  positive: { labelKey: 'aiReport.tone.positive', bg: colors.successLight, border: colors.successBorder, text: colors.successText },
  neutral:  { labelKey: 'aiReport.tone.neutral', bg: colors.primaryLight, border: colors.chipBorder, text: colors.primaryDark },
  mixed:    { labelKey: 'aiReport.tone.mixed', bg: colors.warningLight, border: colors.warningBorder, text: colors.warningText },
  tough:    { labelKey: 'aiReport.tone.tough', bg: colors.pinkLight, border: colors.pinkBorder, text: colors.pink },
});

function looksLikeMarkdown(s: string): boolean {
  return /(^|\n)\s*(#{1,6}\s|[-*]\s|\d+\.\s)/.test(s) || /\*\*[^*]+\*\*/.test(s);
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

const createStyles = (colors: ThemePalette) => StyleSheet.create({
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
  emptyIcon: { marginBottom: spacing.sm },
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
  structuredContainer: {
    gap: spacing.sm,
  },
  headline: {
    fontSize: typography.sizes.xl,
    fontFamily: typography.fonts.display,
    color: colors.text,
    marginTop: spacing.xs,
  },
  toneChip: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  toneChipText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  summaryCard: {
    padding: spacing.md,
  },
  summaryText: {
    fontSize: typography.sizes.body,
    color: colors.text,
    lineHeight: typography.sizes.body * typography.lineHeights.relaxed,
  },
  patternsSection: {
    gap: spacing.xs,
  },
  patternsCard: {
    paddingVertical: spacing.sm,
  },
  patternRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  patternRowDivider: {
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  patternBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
    marginTop: 8,
  },
  patternText: {
    flex: 1,
    fontSize: typography.sizes.md,
    color: colors.text,
    lineHeight: typography.sizes.md * typography.lineHeights.normal,
  },
  highlightCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.accentLight,
    borderWidth: 1,
    borderColor: colors.accentBorder,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  highlightIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  highlightLabel: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    color: colors.text,
  },
  highlightDetail: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    lineHeight: typography.sizes.sm * typography.lineHeights.normal,
    marginTop: 2,
  },
  nudgeCard: {
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.chipBorder,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.xs,
  },
  nudgeHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  nudgeTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    color: colors.primaryDark,
  },
  nudgeBody: {
    fontSize: typography.sizes.md,
    color: colors.text,
    lineHeight: typography.sizes.md * typography.lineHeights.relaxed,
  },
});

const createMarkdownStyles = (colors: ThemePalette) => StyleSheet.create({
  body: {
    color: colors.text,
    fontSize: typography.sizes.body,
    lineHeight: typography.sizes.body * typography.lineHeights.relaxed,
  },
  heading1: {
    fontSize: typography.sizes.xl,
    fontFamily: typography.fonts.display,
    color: colors.text,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  heading2: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  heading3: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    color: colors.primaryDark,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  paragraph: {
    marginTop: 0,
    marginBottom: spacing.sm,
  },
  strong: {
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  em: {
    fontStyle: 'italic',
  },
  bullet_list: {
    marginBottom: spacing.sm,
  },
  ordered_list: {
    marginBottom: spacing.sm,
  },
  list_item: {
    marginBottom: 4,
  },
  bullet_list_icon: {
    color: colors.primary,
    marginLeft: 0,
    marginRight: spacing.xs,
    fontSize: typography.sizes.md,
    lineHeight: typography.sizes.md * typography.lineHeights.normal,
  },
  ordered_list_icon: {
    color: colors.primary,
    marginRight: spacing.xs,
  },
  code_inline: {
    backgroundColor: colors.borderLight,
    color: colors.primaryDark,
    paddingHorizontal: 4,
    borderRadius: radius.sm,
  },
  blockquote: {
    backgroundColor: colors.primaryLight,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
    paddingLeft: spacing.sm,
    paddingVertical: spacing.xs,
    marginVertical: spacing.xs,
  },
  hr: {
    backgroundColor: colors.border,
    height: 1,
    marginVertical: spacing.sm,
  },
});

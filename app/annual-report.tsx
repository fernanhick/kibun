import { useState, useMemo, useEffect } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Screen } from '@components/index';
import { SparkleOverlay } from '@components/SparkleOverlay';
import { useMoodEntryStore, useSessionStore } from '@store/index';
import { getMoodFrequency, GROUP_SCORES } from '@lib/insights';
import { MOOD_MAP } from '@constants/moods';
import { supabase } from '@lib/supabase';
import { colors, spacing, typography, radius } from '@constants/theme';

const MONTH_LABELS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

function computeStreakAll(entries: { loggedAt: string }[]): number {
  const days = new Set(entries.map((e) => e.loggedAt.split('T')[0]));
  const sorted = Array.from(days).sort();
  let longest = 0;
  let current = 0;
  let prev: string | null = null;
  for (const d of sorted) {
    if (prev) {
      const diff = (new Date(d).getTime() - new Date(prev).getTime()) / 86400000;
      if (diff === 1) { current++; }
      else { longest = Math.max(longest, current); current = 1; }
    } else {
      current = 1;
    }
    prev = d;
  }
  return Math.max(longest, current);
}

function computeMonthAvg(entries: { loggedAt: string; moodId: string }[]) {
  const buckets: Record<string, number[]> = {};
  for (const e of entries) {
    const m = e.loggedAt.slice(0, 7); // YYYY-MM
    const mood = MOOD_MAP[e.moodId as keyof typeof MOOD_MAP];
    const score = mood ? GROUP_SCORES[mood.group] : 3;
    if (!buckets[m]) buckets[m] = [];
    buckets[m].push(score);
  }
  return Object.entries(buckets).map(([month, scores]) => ({
    month,
    avg: scores.reduce((a, b) => a + b, 0) / scores.length,
  }));
}

export default function AnnualReportScreen() {
  const router = useRouter();
  const session = useSessionStore((s) => s.session);
  const isPro = session?.subscriptionStatus === 'trial' || session?.subscriptionStatus === 'active';
  const entries = useMoodEntryStore((s) => s.entries);

  const currentYear = new Date().getFullYear().toString();

  const yearEntries = useMemo(
    () => entries.filter((e) => e.loggedAt.startsWith(currentYear)),
    [entries, currentYear],
  );

  const stats = useMemo(() => {
    if (yearEntries.length === 0) return null;
    const frequency = getMoodFrequency(yearEntries);
    const distinctMoods = new Set(yearEntries.map((e) => e.moodId)).size;
    const longestStreak = computeStreakAll(yearEntries);
    const monthAvgs = computeMonthAvg(yearEntries);
    const bestMonth = monthAvgs.sort((a, b) => b.avg - a.avg)[0];
    const worstMonth = [...monthAvgs].sort((a, b) => a.avg - b.avg)[0];
    return {
      totalCheckIns: yearEntries.length,
      topMoods: frequency.slice(0, 3).map((f) => ({ label: f.label, count: f.count })),
      emotionalRange: distinctMoods,
      longestStreak,
      bestMonth: bestMonth ? MONTH_LABELS[parseInt(bestMonth.month.split('-')[1]) - 1] : '—',
      worstMonth: worstMonth ? MONTH_LABELS[parseInt(worstMonth.month.split('-')[1]) - 1] : '—',
    };
  }, [yearEntries]);

  const [narrative, setNarrative] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isPro || !stats || stats.totalCheckIns < 10 || !supabase) return;

    const yearStart = `${currentYear}-01-01`;

    const fetchNarrative = async () => {
      // Check cache first
      const { data: cached } = await supabase!
        .from('ai_reports')
        .select('content')
        .eq('report_type', 'annual')
        .eq('period_start', yearStart)
        .maybeSingle();

      if (cached?.content) { setNarrative(cached.content); return; }

      setLoading(true);
      try {
        const { data, error: fnError } = await supabase!.functions.invoke('generate-annual-report', {
          body: stats,
        });
        if (fnError) throw fnError;
        setNarrative(data?.narrative ?? null);
      } catch (e) {
        setError('Could not generate your story. Try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchNarrative();
  }, [isPro, stats]);

  if (!stats || yearEntries.length === 0) {
    return (
      <Screen scrollable={false} layout="wide">
        <LinearGradient
          colors={[colors.pink, colors.pinkEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={reportStyles.hero}
        >
          <SparkleOverlay count={20} />
          <Pressable onPress={() => router.back()} style={reportStyles.backBtn} hitSlop={12}>
            <Ionicons name="arrow-back" size={22} color={colors.textInverse} />
          </Pressable>
          <Text style={reportStyles.heroTitle}>{currentYear} in Mood</Text>
        </LinearGradient>
        <View style={reportStyles.emptyContainer}>
          <Text style={reportStyles.emptyTitle}>Not enough data yet</Text>
          <Text style={reportStyles.emptySubtitle}>
            Keep checking in — your {currentYear} story will appear here.
          </Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen scrollable={false} layout="wide" contentContainerStyle={reportStyles.root}>
      <LinearGradient
        colors={[colors.pink, colors.pinkEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={reportStyles.hero}
      >
        <SparkleOverlay count={24} />
        <Pressable onPress={() => router.back()} style={reportStyles.backBtn} hitSlop={12}>
          <Ionicons name="arrow-back" size={22} color={colors.textInverse} />
        </Pressable>
        <View style={reportStyles.badge}>
          <Ionicons name="sparkles" size={12} color={colors.textInverse} />
          <Text style={reportStyles.badgeText}>Year in Review</Text>
        </View>
        <Text style={reportStyles.heroTitle}>{currentYear} in Mood</Text>
        <Text style={reportStyles.heroSubtitle}>
          {stats.totalCheckIns} moments of self-awareness
        </Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={reportStyles.content} showsVerticalScrollIndicator={false}>

        {/* Stats grid */}
        <View style={reportStyles.statsGrid}>
          <StatCard emoji="📝" value={`${stats.totalCheckIns}`} label="Check-ins" />
          <StatCard emoji="🔥" value={`${stats.longestStreak}d`} label="Best streak" />
          <StatCard emoji="🎨" value={`${stats.emotionalRange}`} label="Moods used" />
          <StatCard emoji="✨" value={stats.bestMonth} label="Best month" />
        </View>

        {/* Top moods */}
        <View style={reportStyles.section}>
          <Text style={reportStyles.sectionTitle}>Top moods</Text>
          {stats.topMoods.map((m, i) => (
            <View key={m.label} style={reportStyles.topMoodRow}>
              <Text style={reportStyles.topMoodRank}>#{i + 1}</Text>
              <Text style={reportStyles.topMoodLabel}>{m.label}</Text>
              <Text style={reportStyles.topMoodCount}>{m.count}×</Text>
            </View>
          ))}
        </View>

        {/* Months */}
        <View style={reportStyles.section}>
          <Text style={reportStyles.sectionTitle}>Month highlights</Text>
          <View style={reportStyles.monthRow}>
            <View style={[reportStyles.monthCard, reportStyles.monthCardGood]}>
              <Text style={reportStyles.monthCardEmoji}>☀️</Text>
              <Text style={reportStyles.monthCardLabel}>{stats.bestMonth}</Text>
              <Text style={reportStyles.monthCardHint}>Best month</Text>
            </View>
            <View style={[reportStyles.monthCard, reportStyles.monthCardTough]}>
              <Text style={reportStyles.monthCardEmoji}>🌧️</Text>
              <Text style={reportStyles.monthCardLabel}>{stats.worstMonth}</Text>
              <Text style={reportStyles.monthCardHint}>Toughest month</Text>
            </View>
          </View>
        </View>

        {/* AI Narrative */}
        {isPro && (
          <View style={reportStyles.section}>
            <Text style={reportStyles.sectionTitle}>Your story</Text>
            {loading ? (
              <View style={reportStyles.narrativeCard}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={reportStyles.narrativeLoading}>Writing your year in words…</Text>
              </View>
            ) : error ? (
              <View style={reportStyles.narrativeCard}>
                <Text style={reportStyles.narrativeError}>{error}</Text>
              </View>
            ) : narrative ? (
              <View style={reportStyles.narrativeCard}>
                <Ionicons name="sparkles" size={14} color={colors.primary} style={{ marginBottom: 6 }} />
                <Text style={reportStyles.narrativeText}>{narrative}</Text>
              </View>
            ) : stats.totalCheckIns < 10 ? (
              <View style={reportStyles.narrativeCard}>
                <Text style={reportStyles.narrativeLoading}>
                  Log at least 10 check-ins this year to unlock your AI story.
                </Text>
              </View>
            ) : null}
          </View>
        )}

        {!isPro && (
          <Pressable
            style={reportStyles.upgradeCard}
            onPress={() => router.push('/paywall')}
            accessibilityRole="button"
            accessibilityLabel="Upgrade to Pro to unlock your Year in Words AI narrative"
          >
            <Text style={reportStyles.upgradeIcon}>✨</Text>
            <View style={reportStyles.upgradeInfo}>
              <Text style={reportStyles.upgradeTitle}>Your year in words</Text>
              <Text style={reportStyles.upgradeSubtitle}>
                Unlock a personalised AI narrative of your {currentYear}. Pro feature.
              </Text>
            </View>
            <View style={reportStyles.proBadge}>
              <Text style={reportStyles.proBadgeText}>Pro</Text>
            </View>
          </Pressable>
        )}
      </ScrollView>
    </Screen>
  );
}

function StatCard({ emoji, value, label }: { emoji: string; value: string; label: string }) {
  return (
    <View style={reportStyles.statCard}>
      <Text style={reportStyles.statEmoji}>{emoji}</Text>
      <Text style={reportStyles.statValue}>{value}</Text>
      <Text style={reportStyles.statLabel}>{label}</Text>
    </View>
  );
}

const reportStyles = StyleSheet.create({
  root: { flex: 1 },
  hero: {
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginTop: spacing.md,
    gap: spacing.xs,
  },
  backBtn: {
    alignSelf: 'flex-start',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.36)',
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
  },
  badgeText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    color: colors.textInverse,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  heroTitle: {
    fontSize: typography.sizes.xxl,
    fontFamily: typography.fonts.display,
    color: colors.textInverse,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: typography.sizes.sm,
    color: colors.sparkle,
    textAlign: 'center',
    paddingBottom: spacing.xs,
  },
  content: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  statCard: {
    flex: 1,
    minWidth: '44%',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderWidth: 1.2,
    borderColor: colors.pinkBorder,
    borderRadius: 22,
    paddingVertical: spacing.md,
    gap: 4,
  },
  statEmoji: { fontSize: 24 },
  statValue: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  statLabel: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    fontFamily: typography.fonts.ui,
  },
  section: { gap: spacing.sm },
  sectionTitle: {
    fontSize: typography.sizes.lg,
    fontFamily: typography.fonts.ui,
    color: colors.pink,
  },
  topMoodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.pinkLight,
    borderWidth: 1.2,
    borderColor: colors.pinkBorder,
    borderRadius: radius.lg,
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
  },
  topMoodRank: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.textSecondary,
    width: 28,
  },
  topMoodLabel: {
    flex: 1,
    fontSize: typography.sizes.body,
    fontFamily: typography.fonts.ui,
    color: colors.text,
  },
  topMoodCount: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
  },
  monthRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  monthCard: {
    flex: 1,
    alignItems: 'center',
    borderRadius: 22,
    borderWidth: 1.2,
    paddingVertical: spacing.md,
    gap: 4,
  },
  monthCardGood: {
    backgroundColor: '#F1FFF2',
    borderColor: '#A5D6A7',
  },
  monthCardTough: {
    backgroundColor: '#EFF6FF',
    borderColor: '#93C5FD',
  },
  monthCardEmoji: { fontSize: 24 },
  monthCardLabel: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  monthCardHint: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
  },
  narrativeCard: {
    backgroundColor: colors.pinkLight,
    borderWidth: 1,
    borderColor: colors.pinkBorder,
    borderRadius: 20,
    padding: spacing.md,
    gap: spacing.xs,
    alignItems: 'center',
  },
  narrativeText: {
    fontSize: typography.sizes.body,
    color: colors.text,
    lineHeight: 24,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  narrativeLoading: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  narrativeError: {
    fontSize: typography.sizes.sm,
    color: colors.error,
    textAlign: 'center',
  },
  upgradeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.pinkLight,
    borderWidth: 1.2,
    borderColor: colors.pinkBorder,
    borderRadius: 22,
    padding: spacing.md,
  },
  upgradeIcon: { fontSize: typography.sizes.xl },
  upgradeInfo: { flex: 1 },
  upgradeTitle: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
    color: colors.text,
  },
  upgradeSubtitle: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  proBadge: {
    backgroundColor: colors.pink,
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  proBadgeText: {
    fontSize: typography.sizes.xs,
    color: colors.textInverse,
    fontWeight: typography.weights.semibold,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  emptyTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    color: colors.text,
  },
  emptySubtitle: {
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});

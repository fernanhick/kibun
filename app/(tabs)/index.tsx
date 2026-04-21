import { useMemo, useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSessionStore, useMoodEntryStore, useAchievementsStore, useDailyInsightStore } from '@store/index';
import { useUiPrefsStore } from '@store/uiPrefsStore';
import { useOnboardingStore } from '@store/onboardingStore';
import { useHabitsStore } from '@store/habitsStore';
import { useNotificationPrefsStore } from '@store/notificationPrefsStore';
import { Button, Card, MoodBubble, Screen } from '@components/index';
import { SparkleOverlay } from '@components/SparkleOverlay';
import { MOOD_MAP, type MoodId } from '@constants/moods';
import { colors, spacing, typography, radius } from '@constants/theme';
import { ACHIEVEMENT_DEFINITIONS } from '@lib/achievements';
import { fetchDailyInsight } from '@lib/dailyInsight';
import { computeAdaptiveTimes } from '@lib/notifications';
import type { MoodSlot, Habit, HabitLog } from '@models/index';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

const SLOT_LABELS: Record<MoodSlot, string> = {
  morning: 'Morning',
  afternoon: 'Afternoon',
  night: 'Evening',
  pre_sleep: 'Night',
};

function formatTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour <= 11) return 'Good morning';
  if (hour >= 12 && hour <= 16) return 'Good afternoon';
  if (hour >= 17 && hour <= 20) return 'Good evening';
  return 'Time to wind down';
}

const MOTIVATIONAL_MESSAGES = {
  positive: [
    "You're on a roll — keep that energy going!",
    "Yesterday was a good one. Let's build on it!",
    "Good vibes all around. You've got this!",
    "Your positivity is shining through. Keep it up!",
    "Yesterday felt bright — let today be even better.",
    "You're in a great flow. Embrace every moment.",
    "Riding the good wave — stay with it!",
    "Great days deserve to be celebrated. You did well!",
  ],
  struggling: [
    "Every day is a fresh start. You've got this.",
    "It's okay to not be okay — take it one breath at a time.",
    "Be gentle with yourself today. You're doing better than you think.",
    "Hard moments build resilience. We're here with you.",
    "You showed up — and that's what counts.",
    "Tough times don't last. You're stronger than you know.",
    "Even the smallest win counts today. What's one good thing?",
    "You're not alone in this. Take a breath — you've got today.",
    "Healing isn't linear. Every moment forward matters.",
  ],
  neutral: [
    "Check in with yourself — every moment counts.",
    "A new day, a fresh chapter. How are you feeling?",
    "Your feelings matter. Let's explore them together.",
    "Ready to tune in? Let's see how you're doing.",
    "Small check-ins lead to big self-awareness.",
    "How's your inner world today?",
    "Take a moment — how are you really feeling?",
    "Today's a great day to understand yourself better.",
  ],
} as const;

type MoodSentiment = keyof typeof MOTIVATIONAL_MESSAGES;

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
  const router = useRouter();
  const insets = useSafeAreaInsets();
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
    const pool = MOTIVATIONAL_MESSAGES[sentiment];
    return pool[msgSeed % pool.length];
  }, [entries, today, msgSeed]);

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

  const unlockedIds = useAchievementsStore((s) => s.unlockedIds);
  const unlockedDefs = useMemo(
    () => ACHIEVEMENT_DEFINITIONS.filter((d) => unlockedIds.includes(d.id)),
    [unlockedIds]
  );

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

    if (insightContent?.date === today) return;

    setInsightLoading(true);
    fetchDailyInsight({ profile }).then((text) => {
      if (text) setInsight(today, text);
      setInsightLoading(false);
    });
  }, [isPro, isAnonymous, insightHydrated, today]);

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

  return (
    <View style={styles.container}>
      {showBanner && (
        <View style={[styles.anonBanner, { paddingTop: insets.top + spacing.sm }]}>
          <Pressable
            style={styles.anonBannerContent}
            onPress={() => router.push('/register')}
            accessibilityRole="button"
            accessibilityLabel="Sign up to save your data"
            accessibilityHint="Your mood data is stored on this device only. Tap to create an account."
          >
            <Text style={styles.anonBannerText}>
              Your data is on this device only.{' '}
              <Text style={styles.anonBannerLink}>Sign up to sync it →</Text>
            </Text>
          </Pressable>
          <Pressable
            onPress={dismissBanner}
            accessibilityRole="button"
            accessibilityLabel="Dismiss banner"
            hitSlop={12}
            style={styles.anonBannerDismiss}
          >
            <Ionicons name="close" size={16} color={colors.textSecondary} />
          </Pressable>
        </View>
      )}

      <Screen scrollable={true}>
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
                accessibilityLabel={`Current streak: ${streak} days`}
              >
                {streak} day streak 🔥
              </Text>
            )}
          </View>

          <View style={styles.ctaSection}>
            <Button
              label="Log mood"
              onPress={() => router.push('/check-in' as Href)}
              variant="sunrise"
              fullWidth
            />
          </View>
        </LinearGradient>

        {isPro && !isAnonymous && (insightLoading || insightContent?.date === today) && (
          <DailyInsightCard
            content={insightContent?.date === today ? insightContent.content : null}
            isLoading={insightLoading}
          />
        )}

        <HabitsSection
          habits={habits}
          todayLogs={todayHabitLogs}
          today={today}
          onLog={logHabit}
          onClear={clearHabitLog}
          onManage={() => router.push('/manage-habits' as Href)}
        />

        {unlockedDefs.length > 0 && (
          <View style={styles.achievementsSection}>
            <View style={styles.sectionHeaderChip}>
              <Text style={styles.sectionHeader}>Achievements</Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.achievementsRow}
            >
              {unlockedDefs.map((def) => (
                <View key={def.id} style={styles.achievementBadge} accessibilityLabel={`${def.label}: ${def.description}`}>
                  <Text style={styles.achievementEmoji}>{def.emoji}</Text>
                  <Text style={styles.achievementLabel}>{def.label}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        <View style={styles.todaySection}>
          <View style={styles.sectionHeaderChip}>
            <Text
              style={styles.sectionHeader}
              accessibilityRole="header"
            >
              Today{todayEntries.length > 0 ? ` (${todayEntries.length})` : ''}
            </Text>
          </View>

          {todayEntries.length === 0 ? (
            <Text style={styles.emptyText}>
              No moods logged yet. How are you feeling?
            </Text>
          ) : (
            todayEntries.map((entry) => {
              const entryMood = MOOD_MAP[entry.moodId as MoodId];
              return (
                <Pressable
                  key={entry.id}
                  onPress={() => router.push(`/day-detail?date=${today}` as Href)}
                  accessibilityLabel={`${entryMood?.label ?? entry.moodId} at ${formatTime(entry.loggedAt)}. Tap to view details.`}
                  accessibilityRole="button"
                >
                  <View style={styles.entryCard}>
                    <View style={styles.entryRow}>
                      {entryMood && (
                        <MoodBubble mood={entryMood} size="sm" />
                      )}
                      <Text style={styles.entryMoodLabel}>
                        {entryMood?.label ?? entry.moodId}
                      </Text>
                      <Text style={styles.entrySlotInline}>
                        {SLOT_LABELS[entry.slot]}
                      </Text>
                      <View style={styles.entryRight}>
                        <Text style={styles.entryTime}>
                          {formatTime(entry.loggedAt)}
                        </Text>
                        <Ionicons name="chevron-forward" size={14} color={colors.textDisabled} />
                      </View>
                    </View>
                  </View>
                </Pressable>
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
  onLog: (habitId: string, logDate: string, value: number) => void;
  onClear: (habitId: string, logDate: string) => void;
  onManage: () => void;
}

function HabitsSection({ habits, todayLogs, today, onLog, onClear, onManage }: HabitsSectionProps) {
  if (habits.length === 0) {
    return (
      <Pressable
        style={habitStyles.emptyRow}
        onPress={onManage}
        accessibilityRole="button"
        accessibilityLabel="Set up habits to track alongside your mood"
      >
        <Ionicons name="add-circle-outline" size={16} color={colors.primary} />
        <Text style={habitStyles.emptyText}>Track daily habits</Text>
      </Pressable>
    );
  }

  return (
    <View style={habitStyles.wrapper}>
      <View style={habitStyles.headerRow}>
        <View style={styles.sectionHeaderChip}>
          <Text style={styles.sectionHeader}>Habits</Text>
        </View>
        <Pressable onPress={onManage} hitSlop={8} accessibilityRole="button" accessibilityLabel="Manage habits">
          <Text style={habitStyles.manageLink}>Manage</Text>
        </Pressable>
      </View>
      {habits.map((h) => {
        const log = todayLogs.find((l) => l.habitId === h.id);
        if (h.trackingType === 'boolean') {
          const done = log?.value === 1;
          return (
            <Pressable
              key={h.id}
              style={[habitStyles.habitRow, done && habitStyles.habitRowDone]}
              onPress={() => done ? onClear(h.id, today) : onLog(h.id, today, 1)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: done }}
              accessibilityLabel={`${h.name}: ${done ? 'done, tap to unmark' : 'not done, tap to mark'}`}
            >
              <Text style={habitStyles.habitIcon}>{h.icon}</Text>
              <Text style={[habitStyles.habitName, done && habitStyles.habitNameDone]}>{h.name}</Text>
              <View style={[habitStyles.checkBox, done && habitStyles.checkBoxDone]}>
                {done && <Ionicons name="checkmark" size={14} color={colors.textInverse} />}
              </View>
            </Pressable>
          );
        }
        // scale habit: 1–5 dots
        const currentValue = log?.value ?? 0;
        return (
          <View key={h.id} style={habitStyles.habitRow}>
            <Text style={habitStyles.habitIcon}>{h.icon}</Text>
            <Text style={habitStyles.habitName}>{h.name}</Text>
            <View style={habitStyles.scaleRow}>
              {[1, 2, 3, 4, 5].map((v) => (
                <Pressable
                  key={v}
                  onPress={() => currentValue === v ? onClear(h.id, today) : onLog(h.id, today, v)}
                  style={[habitStyles.scaleDot, currentValue >= v && habitStyles.scaleDotActive]}
                  accessibilityRole="button"
                  accessibilityLabel={`${h.name} level ${v}`}
                  accessibilityState={{ selected: currentValue >= v }}
                />
              ))}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const habitStyles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: spacing.md,
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    borderWidth: 1.5,
    borderColor: '#C8DCFF',
    borderRadius: radius.lg,
    borderStyle: 'dashed',
    backgroundColor: '#F7FBFF',
  },
  emptyText: {
    fontSize: typography.sizes.sm,
    color: colors.primary,
    fontFamily: typography.fonts.ui,
  },
  habitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderWidth: 1.2,
    borderColor: '#DCE9FF',
    borderRadius: radius.md,
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
  },
  habitRowDone: {
    borderColor: '#A5D6A7',
    backgroundColor: '#F1FFF2',
  },
  habitIcon: {
    fontSize: 18,
  },
  habitName: {
    flex: 1,
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.ui,
    color: colors.text,
  },
  habitNameDone: {
    color: '#388E3C',
  },
  checkBox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#C8DCFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkBoxDone: {
    borderColor: '#66BB6A',
    backgroundColor: '#66BB6A',
  },
  scaleRow: {
    flexDirection: 'row',
    gap: 5,
  },
  scaleDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: '#C8DCFF',
    backgroundColor: '#F0F5FF',
  },
  scaleDotActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
});

// ─── Daily Insight Card ───────────────────────────────────────────────────────

function DailyInsightCard({ content, isLoading }: { content: string | null; isLoading: boolean }) {
  return (
    <View style={insightStyles.wrapper}>
      <View style={insightStyles.header}>
        <Ionicons name="sparkles" size={12} color={colors.primary} />
        <Text style={insightStyles.headerText}>Today's Insight</Text>
      </View>
      {isLoading && !content ? (
        <View style={insightStyles.loadingRow}>
          <ActivityIndicator size="small" color={colors.pink} />
          <Text style={insightStyles.loadingText}>Personalising your insight…</Text>
        </View>
      ) : content ? (
        <Text style={insightStyles.body}>{content}</Text>
      ) : null}
    </View>
  );
}

const insightStyles = StyleSheet.create({
  wrapper: {
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    backgroundColor: colors.pinkLight,
    borderWidth: 1,
    borderColor: colors.pinkBorder,
    borderRadius: 20,
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

const styles = StyleSheet.create({
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
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.32)',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    marginTop: spacing.xs,
    marginHorizontal: spacing.md,
  },
  heroTextCol: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  greeting: {
    fontSize: typography.sizes.xxl,
    fontFamily: typography.fonts.display,
    color: colors.textInverse,
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
    color: '#7A4A00',
    backgroundColor: colors.accentLight,
    borderWidth: 1,
    borderColor: colors.accentBorder,
    borderRadius: 999,
    paddingVertical: 3,
    paddingHorizontal: spacing.sm,
  },
  ctaSection: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
  },
  todaySection: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  achievementsSection: {
    paddingHorizontal: spacing.md,
    marginTop: spacing.lg,
    gap: spacing.md,
  },
  achievementsRow: {
    gap: spacing.sm,
    paddingRight: spacing.md,
  },
  achievementBadge: {
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surface,
    borderWidth: 1.2,
    borderColor: '#DCE9FF',
    borderRadius: 16,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    minWidth: 72,
  },
  achievementEmoji: {
    fontSize: 22,
  },
  achievementLabel: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fonts.ui,
    color: colors.primaryDark,
    textAlign: 'center',
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
    color: '#B07000',
  },
  emptyText: {
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: spacing.xl,
    backgroundColor: '#FFF6EC',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FFE4BF',
  },
  entryCard: {
    borderWidth: 1,
    borderColor: '#EFEAFF',
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
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
    backgroundColor: '#FFF4DF',
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

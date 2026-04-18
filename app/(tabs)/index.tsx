import { useMemo, useRef, useEffect, useContext } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
// SpotlightTourContext is not in the public API; import from the compiled dist
// file so Metro resolves to the same cached module the provider uses.
// eslint-disable-next-line import/no-internal-modules
import { SpotlightTourContext } from 'react-native-spotlight-tour/dist/lib/SpotlightTour.context';
import { useTourAutoStart } from '@hooks/useTourAutoStart';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSessionStore, useMoodEntryStore, useAchievementsStore } from '@store/index';
import { useUiPrefsStore } from '@store/uiPrefsStore';
import { Button, Card, MoodBubble, Screen } from '@components/index';
import { SparkleOverlay } from '@components/SparkleOverlay';
import { MOOD_MAP, type MoodId } from '@constants/moods';
import { colors, spacing, typography } from '@constants/theme';
import { ACHIEVEMENT_DEFINITIONS } from '@lib/achievements';
import type { MoodSlot } from '@models/index';

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

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { session } = useSessionStore();
  const isAnonymous = !session || session.authStatus === 'anonymous';
  const bannerDismissedAt = useUiPrefsStore((s) => s.bannerDismissedAt);
  const dismissBanner = useUiPrefsStore((s) => s.dismissBanner);
  const showBanner = isAnonymous && (bannerDismissedAt === null || Date.now() - bannerDismissedAt > SEVEN_DAYS_MS);
  const today = new Date().toISOString().split('T')[0];

  // Select stable reference (entries array), derive outside selector to avoid
  // infinite loop: .filter() creates a new array each call, breaking useSyncExternalStore.
  const entries = useMoodEntryStore((s) => s.entries);

  const todayEntries = useMemo(
    () => entries.filter((e) => e.loggedAt.startsWith(today)),
    [entries, today]
  );

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

  const logMoodRef = useRef<View>(null);
  const { current: tourStep, changeSpot } = useContext(SpotlightTourContext);

  useEffect(() => {
    if (tourStep !== 0) return;
    const timer = setTimeout(() => {
      logMoodRef.current?.measureInWindow((x, y, width, height) => {
        changeSpot({ x, y, width, height });
      });
    }, 50);
    return () => clearTimeout(timer);
  }, [tourStep, changeSpot]);

  useTourAutoStart();

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
            <Text style={styles.greetingSub}>How is your energy right now?</Text>
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
            <View ref={logMoodRef} collapsable={false} style={styles.ctaAttach}>
              <Button
                label="Log mood"
                onPress={() => router.push('/check-in' as Href)}
                variant="sunrise"
                fullWidth
              />
            </View>
          </View>
        </LinearGradient>

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
    paddingVertical: spacing.md,
    marginTop: spacing.md,
    marginHorizontal: spacing.md,
  },
  heroTextCol: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  greeting: {
    fontSize: typography.sizes.xl,
    fontFamily: typography.fonts.display,
    color: colors.textInverse,
  },
  greetingSub: {
    fontSize: typography.sizes.sm,
    color: colors.sparkle,
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
  ctaAttach: {
    alignSelf: 'stretch',
  },
  ctaSection: {
    paddingHorizontal: spacing.sm,
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

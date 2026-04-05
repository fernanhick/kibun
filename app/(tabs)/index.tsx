import { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSessionStore, useMoodEntryStore } from '@store/index';
import { useUiPrefsStore } from '@store/uiPrefsStore';
import { Button, Card, MoodBubble, Screen } from '@components/index';
import { Shiba } from '@components/Shiba';
import type { ShibaVariant } from '@components/Shiba';
import { MOOD_MAP, type MoodId, type MoodGroup } from '@constants/moods';
import { colors, spacing, typography } from '@constants/theme';
import type { MoodSlot } from '@models/index';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

const SLOT_LABELS: Record<MoodSlot, string> = {
  morning: 'Morning',
  afternoon: 'Afternoon',
  night: 'Evening',
  pre_sleep: 'Night',
};

const SHIBA_MAP: Record<MoodGroup, ShibaVariant> = {
  green: 'happy',
  neutral: 'neutral',
  'red-orange': 'sad',
  blue: 'sad',
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

  const mostRecent = todayEntries[0];
  const mood = mostRecent ? MOOD_MAP[mostRecent.moodId as MoodId] : null;
  const shibaVariant: ShibaVariant = mood ? SHIBA_MAP[mood.group] : 'neutral';

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
        <View style={styles.greetingSection}>
          <Shiba variant={shibaVariant} size={140} />
          <Text style={styles.greeting}>{getGreeting()}</Text>
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
            fullWidth
          />
        </View>

        <View style={styles.todaySection}>
          <Text
            style={styles.sectionHeader}
            accessibilityRole="header"
          >
            Today{todayEntries.length > 0 ? ` (${todayEntries.length})` : ''}
          </Text>

          {todayEntries.length === 0 ? (
            <Text style={styles.emptyText}>
              No moods logged yet. How are you feeling?
            </Text>
          ) : (
            todayEntries.map((entry) => {
              const entryMood = MOOD_MAP[entry.moodId as MoodId];
              return (
                <View
                  key={entry.id}
                  accessibilityLabel={`${entryMood?.label ?? entry.moodId} at ${formatTime(entry.loggedAt)}`}
                >
                  <Card style={styles.entryCard}>
                    <View style={styles.entryRow}>
                      {entryMood && (
                        <MoodBubble mood={entryMood} size="sm" />
                      )}
                      <View style={styles.entryInfo}>
                        <Text style={styles.entryMoodLabel}>
                          {entryMood?.label ?? entry.moodId}
                        </Text>
                        <Text style={styles.entryTime}>
                          {formatTime(entry.loggedAt)}
                        </Text>
                      </View>
                    </View>
                    {entry.note && (
                      <Text style={styles.entryNote} numberOfLines={2}>
                        {entry.note}
                      </Text>
                    )}
                    <Text style={styles.entrySlot}>
                      {SLOT_LABELS[entry.slot]}
                    </Text>
                  </Card>
                </View>
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
  greetingSection: {
    alignItems: 'center',
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  greeting: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.text,
    textAlign: 'center',
  },
  streakBadge: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    color: colors.primary,
    textAlign: 'center',
  },
  ctaSection: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg,
  },
  todaySection: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
    gap: spacing.sm,
  },
  sectionHeader: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  emptyText: {
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: spacing.lg,
  },
  entryCard: {
    marginBottom: spacing.xs,
  },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  entryInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  entryMoodLabel: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
    color: colors.text,
  },
  entryTime: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
  },
  entryNote: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    marginLeft: 48 + spacing.sm,
  },
  entrySlot: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    marginLeft: 48 + spacing.sm,
  },
});

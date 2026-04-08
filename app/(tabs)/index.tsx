import { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSessionStore, useMoodEntryStore } from '@store/index';
import { useUiPrefsStore } from '@store/uiPrefsStore';
import { Button, Card, MoodBubble, Screen } from '@components/index';
import { Shiba } from '@components/Shiba';
import { SparkleOverlay } from '@components/SparkleOverlay';
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
        <LinearGradient
          colors={[colors.skyStart, colors.skyEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <SparkleOverlay count={20} />
          <View style={styles.sparkleRow}>
            <Text style={styles.sparkleText}>sparkly check-in</Text>
            <Ionicons name="heart" size={14} color={colors.textInverse} />
          </View>
          <View style={styles.greetingSection}>
            <Shiba variant={shibaVariant} size={120} floating />
            <Text style={styles.greeting}>{getGreeting()}</Text>
            <Text style={styles.greetingSub}>How is your energy right now?</Text>
            <Text style={styles.greetingHint}>Tiny steps, big feelings, you got this.</Text>
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
                <View
                  key={entry.id}
                  accessibilityLabel={`${entryMood?.label ?? entry.moodId} at ${formatTime(entry.loggedAt)}`}
                >
                  <Card style={styles.entryCard}>
                    <Text style={styles.entryStarDecal}>
                      {['✦','✧','✶','★','✴'][entry.id.charCodeAt(0) % 5]}
                    </Text>
                    <View style={styles.entryRow}>
                      {entryMood && (
                        <MoodBubble mood={entryMood} size="sm" />
                      )}
                      <View style={styles.entryInfo}>
                        <View style={styles.entryMoodChip}>
                          <Ionicons name="sparkles" size={12} color={colors.primaryDark} />
                          <Text style={styles.entryMoodLabel}>
                            {entryMood?.label ?? entry.moodId}
                          </Text>
                        </View>
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
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.xs,
  },
  heroCard: {
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.32)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
    marginTop: spacing.md,
    marginHorizontal: spacing.md,
  },
  sparkleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.34)',
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  sparkleText: {
    fontSize: typography.sizes.xs,
    color: colors.textInverse,
    fontWeight: typography.weights.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  greeting: {
    fontSize: typography.sizes.xxl,
    fontFamily: typography.fonts.display,
    color: colors.textInverse,
    textAlign: 'center',
  },
  greetingSub: {
    fontSize: typography.sizes.body,
    color: colors.sparkle,
    textAlign: 'center',
  },
  greetingHint: {
    fontSize: typography.sizes.sm,
    color: colors.textInverse,
    opacity: 0.9,
    textAlign: 'center',
  },
  streakBadge: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    color: colors.textInverse,
    textAlign: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.24)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    borderRadius: 999,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  ctaSection: {
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.sm,
  },
  todaySection: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  sectionHeaderChip: {
    alignSelf: 'flex-start',
    backgroundColor: '#F4EEFF',
    borderWidth: 1,
    borderColor: colors.chipBorder,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  sectionHeader: {
    fontSize: typography.sizes.md,
    fontFamily: typography.fonts.ui,
    color: colors.primaryDark,
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
    marginBottom: spacing.xs,
    borderWidth: 1,
    borderColor: '#EFEAFF',
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
  },
  entryStarDecal: {
    position: 'absolute',
    top: 8,
    right: 12,
    fontSize: 13,
    opacity: 0.28,
    color: colors.primary,
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
  entryMoodChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EEF4FF',
    borderWidth: 1,
    borderColor: '#D6E4FF',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  entryMoodLabel: {
    fontSize: typography.sizes.body,
    fontFamily: typography.fonts.ui,
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
    alignSelf: 'flex-start',
    fontSize: typography.sizes.xs,
    color: colors.primaryDark,
    marginTop: spacing.xs,
    marginLeft: 48 + spacing.sm,
    backgroundColor: '#FFF4DF',
    borderWidth: 1,
    borderColor: '#FFE2B1',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
});

import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, Href } from 'expo-router';
import { useSessionStore, useMoodEntryStore } from '@store/index';
import { Button } from '@components/index';
import { Shiba } from '@components/Shiba';
import { colors, spacing, typography } from '@constants/theme';

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { session } = useSessionStore();
  const isAnonymous = !session || session.authStatus === 'anonymous';
  const today = new Date().toISOString().split('T')[0];
  const todayCount = useMoodEntryStore((s) =>
    s.entries.filter((e) => e.loggedAt.startsWith(today)).length
  );

  return (
    <View style={styles.container}>
      {isAnonymous && (
        <Pressable
          style={[styles.anonBanner, { paddingTop: insets.top + spacing.sm }]}
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
      )}

      <View style={styles.ctaArea}>
        <Shiba variant="happy" size={160} />
        <Text style={styles.greeting}>How are you feeling?</Text>
        <Button
          label="Log mood"
          onPress={() => router.push('/check-in' as Href)}
          fullWidth
        />
        {todayCount > 0 && (
          <Text style={styles.todayCount}>
            You've logged {todayCount} mood{todayCount !== 1 ? 's' : ''} today
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  anonBanner: {
    backgroundColor: colors.primaryLight,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  anonBannerText: {
    fontSize: typography.sizes.sm,
    color: colors.text,
  },
  anonBannerLink: {
    fontWeight: typography.weights.semibold,
    color: colors.primary,
  },
  ctaArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  greeting: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.text,
    textAlign: 'center',
  },
  todayCount: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});

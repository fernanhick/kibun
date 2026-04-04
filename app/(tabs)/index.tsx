import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useSessionStore } from '@store/index';
import { colors, spacing, typography } from '@constants/theme';

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { session } = useSessionStore();
  const isAnonymous = !session || session.authStatus === 'anonymous';

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

      <View style={styles.placeholder}>
        <Text style={styles.label}>Home</Text>
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
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 18,
    color: colors.text,
  },
});

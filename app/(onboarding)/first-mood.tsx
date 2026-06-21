import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@components/Screen';
import { MoodLogger } from '@components/MoodLogger';
import { SparkleOverlay } from '@components/SparkleOverlay';
import { OnboardingProgress } from '@components/OnboardingProgress';
import { type MoodId } from '@constants/moods';
import { typography, spacing, radius, shadows } from '@constants/theme';
import { useTheme, type ThemePalette } from '@theme/ThemeContext';
import { useThemedStyles } from '@hooks/useThemedStyles';
import { useOnboardingStore } from '@store/onboardingStore';

// First mood step — mirrors the Home tab: a greeting hero over the inline
// MoodLogger. Logging the first mood (mood + optional note + Save) is the way
// forward; it persists a real entry and advances to the profile questionnaire.
export default function FirstMoodScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { t } = useTranslation(['onboarding', 'screens']);
  const router = useRouter();
  const setFirstMoodId = useOnboardingStore((s) => s.setFirstMoodId);

  const handleLogged = (_entryId: string, moodId: string) => {
    // Keep firstMoodId for downstream personalization (analyzing / plan-snapshot).
    // The entry itself is already persisted by MoodLogger, so notification-permission
    // no longer re-logs it.
    setFirstMoodId(moodId as MoodId);
    router.push('/(onboarding)/profile-physical');
  };

  return (
    <Screen scrollable edgePadding="large">
      <LinearGradient
        colors={[colors.skyStart, colors.skyEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroCard}
      >
        <SparkleOverlay count={20} />
        <View style={styles.heroTopRow}>
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel={t('onboarding:a11y.goBack')}
            hitSlop={12}
            style={styles.backButton}
          >
            <Ionicons name="chevron-back" size={24} color={colors.textInverse} />
          </Pressable>
          <OnboardingProgress current={2} total={6} />
        </View>
        <View style={styles.heroTextCol}>
          <Text style={styles.greeting}>{t('onboarding:firstMood.headline')}</Text>
          <Text style={styles.greetingSub}>{t('onboarding:firstMood.subline')}</Text>
        </View>
      </LinearGradient>

      <View style={styles.loggerCard}>
        <Text style={styles.loggerTitle} accessibilityRole="header">
          {t('screens:checkIn.title')}
        </Text>
        <MoodLogger variant="screen" onLogged={handleLogged} />
      </View>
    </Screen>
  );
}

const createStyles = (colors: ThemePalette) => StyleSheet.create({
  heroCard: {
    ...shadows.md,
    borderRadius: radius.xxl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.32)',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    marginTop: spacing.xs,
    gap: spacing.sm,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: spacing.xs,
    marginLeft: -spacing.xs,
  },
  heroTextCol: {
    alignItems: 'center',
    gap: spacing.xs,
    paddingBottom: spacing.xs,
  },
  greeting: {
    fontSize: typography.sizes.xxl,
    fontFamily: typography.fonts.display,
    color: colors.textInverse,
    letterSpacing: -0.6,
    textAlign: 'center',
    lineHeight: 34,
  },
  greetingSub: {
    fontSize: typography.sizes.body,
    color: colors.sparkle,
    textAlign: 'center',
    paddingHorizontal: spacing.sm,
  },
  loggerCard: {
    ...shadows.sm,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginTop: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  loggerTitle: {
    fontSize: typography.sizes.md,
    fontFamily: typography.fonts.display,
    color: colors.text,
    textAlign: 'center',
  },
});

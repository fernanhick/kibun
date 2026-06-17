import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Screen } from '@components/Screen';
import { Button } from '@components/Button';
import { Shiba, type ShibaVariant } from '@components/Shiba';
import { MoodBubble } from '@components/MoodBubble';
import { OnboardingProgress } from '@components/OnboardingProgress';
import { Ionicons } from '@expo/vector-icons';
import { MOOD_MAP, type MoodId, type MoodGroup } from '@constants/moods';
import { typography, spacing } from '@constants/theme';
import { useTheme, type ThemePalette } from '@theme/ThemeContext';
import { useThemedStyles } from '@hooks/useThemedStyles';

function shibaVariant(group: MoodGroup, id: MoodId): ShibaVariant {
  if (group === 'green') return id === 'excited' ? 'excited' : 'happy';
  if (group === 'neutral') return 'neutral';
  return 'sad'; // red-orange + blue
}

export default function MoodResponseScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { moodId } = useLocalSearchParams<{ moodId: MoodId }>();
  const router = useRouter();
  const { t } = useTranslation(['common', 'moods', 'onboarding']);
  const mood = MOOD_MAP[moodId];

  if (!mood) return null;

  const variant = shibaVariant(mood.group, mood.id);
  const greeting = t('onboarding:moodResponse.greeting');

  return (
    <Screen edgePadding="large">
      <View style={styles.headerRow}>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel={t('onboarding:a11y.goBack')}
          hitSlop={12}
          style={styles.backButton}
        >
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <OnboardingProgress current={3} total={8} tone="dark" />
      </View>
      <View style={styles.container}>
        <Shiba variant={variant} size={220} loop={false} autoPlay />
        <View style={styles.bubbleRow}>
          <MoodBubble mood={mood} size="lg" disabled />
        </View>
        <Text style={styles.greeting}>{greeting}</Text>
        <Text style={styles.phrase}>{t(`moods:${moodId}.response`)}</Text>
        <View style={styles.ctaContainer}>
          <Button
            label={t('common:actions.continue')}
            onPress={() => router.push('/(onboarding)/profile-physical')}
            fullWidth
          />
        </View>
      </View>
    </Screen>
  );
}

const createStyles = (colors: ThemePalette) => StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xs,
  },
  backButton: {
    padding: spacing.xs,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubbleRow: {
    marginTop: spacing.md,
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  greeting: {
    fontFamily: typography.fonts.display,
    fontSize: typography.sizes.lg,
    color: colors.text,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
    marginTop: spacing.lg,
  },
  phrase: {
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xs,
  },
  ctaContainer: {
    marginTop: spacing.xl,
    alignSelf: 'stretch',
    marginHorizontal: spacing.md,
  },
});

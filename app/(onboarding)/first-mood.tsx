import { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import { Screen } from '@components/Screen';
import { Button } from '@components/Button';
import { MoodBubble } from '@components/MoodBubble';
import { Shiba } from '@components/Shiba';
import { SparkleOverlay } from '@components/SparkleOverlay';
import { OnboardingProgress } from '@components/OnboardingProgress';
import { Ionicons } from '@expo/vector-icons';
import { MOODS, type MoodDefinition } from '@constants/moods';
import { colors, typography, spacing } from '@constants/theme';
import { useOnboardingStore } from '@store/onboardingStore';

export default function FirstMoodScreen() {
  const { t } = useTranslation('onboarding');
  const [selectedMood, setSelectedMood] = useState<MoodDefinition | null>(null);
  const router = useRouter();
  const setFirstMoodId = useOnboardingStore((s) => s.setFirstMoodId);

  const handleMoodSelect = (mood: MoodDefinition) => {
    setSelectedMood(mood);
    setFirstMoodId(mood.id);
    router.push(`/(onboarding)/mood-response/${mood.id}`);
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
        <OnboardingProgress current={2} total={8} style={styles.progress} />
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel={t('a11y.goBack')}
          hitSlop={12}
          style={styles.backButton}
        >
          <Ionicons name="chevron-back" size={24} color={colors.textInverse} />
        </Pressable>
        <View style={styles.shibaContainer}>
          <Shiba variant="neutral" size={160} loop autoPlay />
        </View>
        <Text style={styles.headline}>{t('firstMood.headline')}</Text>
        <Text style={styles.subline}>{t('firstMood.subline')}</Text>
      </LinearGradient>

      <View style={styles.gridCard}>
        <View style={styles.grid}>
          {MOODS.map((mood) => (
            <MoodBubble
              key={mood.id}
              mood={mood}
              size="md"
              selected={selectedMood?.id === mood.id}
              onPress={handleMoodSelect}
            />
          ))}
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  backButton: {
    alignSelf: 'flex-start',
    padding: spacing.xs,
  },
  progress: {
    alignSelf: 'flex-end',
    marginBottom: spacing.xs,
  },
  heroCard: {
    borderRadius: 20,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  shibaContainer: {
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  headline: {
    fontSize: typography.sizes.xl,
    fontFamily: typography.fonts.display,
    color: colors.textInverse,
    textAlign: 'center',
  },
  subline: {
    fontSize: typography.sizes.body,
    color: colors.sparkle,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  gridCard: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-evenly',
    gap: spacing.sm,
  },
});

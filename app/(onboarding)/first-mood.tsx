import { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Screen } from '@components/Screen';
import { Button } from '@components/Button';
import { MoodBubble } from '@components/MoodBubble';
import { Shiba } from '@components/Shiba';
import { SparkleOverlay } from '@components/SparkleOverlay';
import { Ionicons } from '@expo/vector-icons';
import { MOODS, type MoodDefinition } from '@constants/moods';
import { colors, typography, spacing } from '@constants/theme';
import { useOnboardingStore } from '@store/onboardingStore';

export default function FirstMoodScreen() {
  const [selectedMood, setSelectedMood] = useState<MoodDefinition | null>(null);
  const router = useRouter();
  const setFirstMoodId = useOnboardingStore((s) => s.setFirstMoodId);

  const handleContinue = () => {
    if (!selectedMood) return;
    setFirstMoodId(selectedMood.id);
    router.push({ pathname: '/(onboarding)/mood-response/[moodId]', params: { moodId: selectedMood.id } });
  };

  return (
    <Screen scrollable>
      <LinearGradient
        colors={[colors.skyStart, colors.skyEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroCard}
      >
        <SparkleOverlay count={20} />
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={12}
          style={styles.backButton}
        >
          <Ionicons name="chevron-back" size={24} color={colors.textInverse} />
        </Pressable>
        <View style={styles.shibaContainer}>
          <Shiba variant="neutral" size={180} loop autoPlay />
        </View>
        <Text style={styles.headline}>How are you feeling?</Text>
        <Text style={styles.subline}>Pick the mood that feels closest right now.</Text>
      </LinearGradient>

      <View style={styles.gridCard}>
        <View style={styles.grid}>
          {MOODS.map((mood) => (
            <MoodBubble
              key={mood.id}
              mood={mood}
              size="md"
              selected={selectedMood?.id === mood.id}
              onPress={setSelectedMood}
            />
          ))}
        </View>
      </View>

      <View style={styles.ctaContainer}>
        <Button
          label="Let's go"
          onPress={handleContinue}
          variant="sunrise"
          disabled={selectedMood === null}
          fullWidth
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  backButton: {
    alignSelf: 'flex-start',
    padding: spacing.xs,
  },
  heroCard: {
    borderRadius: 28,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  shibaContainer: {
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  headline: {
    fontSize: typography.sizes.xxl,
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
    borderRadius: 24,
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
  ctaContainer: {
    marginTop: spacing.md,
    marginHorizontal: spacing.md,
  },
});

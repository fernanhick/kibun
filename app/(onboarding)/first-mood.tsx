import { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '@components/Screen';
import { Button } from '@components/Button';
import { MoodBubble } from '@components/MoodBubble';
import { Shiba } from '@components/Shiba';
import { MOODS, type MoodDefinition } from '@constants/moods';
import { colors, typography, spacing } from '@constants/theme';

export default function FirstMoodScreen() {
  const [selectedMood, setSelectedMood] = useState<MoodDefinition | null>(null);
  const router = useRouter();

  const handleContinue = () => {
    if (!selectedMood) return;
    router.push({ pathname: '/(onboarding)/mood-response/[moodId]', params: { moodId: selectedMood.id } });
  };

  return (
    <Screen scrollable>
      <View style={styles.shibaContainer}>
        <Shiba variant="neutral" size={100} loop autoPlay />
      </View>
      <Text style={styles.headline}>How are you feeling?</Text>
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
      <View style={styles.ctaContainer}>
        <Button
          label="Let's go"
          onPress={handleContinue}
          disabled={selectedMood === null}
          fullWidth
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  shibaContainer: {
    alignItems: 'center',
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  headline: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.semibold,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-evenly',
    gap: spacing.sm,
  },
  ctaContainer: {
    marginTop: spacing.lg,
    marginHorizontal: spacing.md,
  },
});

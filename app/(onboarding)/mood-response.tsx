import { View, Text, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Screen } from '@components/Screen';
import { Button } from '@components/Button';
import { Shiba, type ShibaVariant } from '@components/Shiba';
import { MoodBubble } from '@components/MoodBubble';
import { MOOD_MAP, type MoodId, type MoodGroup } from '@constants/moods';
import { MOOD_RESPONSES } from '@constants/moodResponses';
import { colors, typography, spacing } from '@constants/theme';

function shibaVariant(group: MoodGroup, id: MoodId): ShibaVariant {
  if (group === 'green') return id === 'excited' ? 'excited' : 'happy';
  if (group === 'neutral') return 'neutral';
  return 'sad'; // red-orange + blue
}

export default function MoodResponseScreen() {
  const { moodId } = useLocalSearchParams<{ moodId: MoodId }>();
  const router = useRouter();
  const mood = MOOD_MAP[moodId];

  if (!mood) return null;

  const variant = shibaVariant(mood.group, mood.id);

  return (
    <Screen>
      <View style={styles.container}>
        <LinearGradient
          colors={[colors.skyStart, colors.skyEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <Shiba variant={variant} size={128} loop={false} autoPlay />
          <View style={styles.bubbleRow}>
            <MoodBubble mood={mood} size="lg" disabled />
          </View>
          <Text style={styles.phrase}>{MOOD_RESPONSES[moodId]}</Text>
        </LinearGradient>

        <View style={styles.ctaContainer}>
          <Button
            label="Continue"
            onPress={() => router.push('/(onboarding)/profile-personal')}
            variant="sunrise"
            fullWidth
          />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
  },
  heroCard: {
    borderRadius: 28,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    marginHorizontal: spacing.md,
    marginBottom: spacing.lg,
  },
  bubbleRow: {
    marginTop: spacing.md,
    alignItems: 'center',
  },
  phrase: {
    fontSize: typography.sizes.body,
    color: colors.textInverse,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  ctaContainer: {
    marginTop: spacing.lg,
    marginHorizontal: spacing.md,
  },
});

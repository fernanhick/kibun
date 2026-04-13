import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Screen } from '@components/Screen';
import { Button } from '@components/Button';
import { Shiba, type ShibaVariant } from '@components/Shiba';
import { MoodBubble } from '@components/MoodBubble';
import { Ionicons } from '@expo/vector-icons';
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
      <Pressable
        onPress={() => router.back()}
        accessibilityRole="button"
        accessibilityLabel="Go back"
        hitSlop={12}
        style={styles.backButton}
      >
        <Ionicons name="chevron-back" size={24} color={colors.text} />
      </Pressable>
      <View style={styles.container}>
        <Shiba variant={variant} size={220} loop={false} autoPlay />
        <View style={styles.bubbleRow}>
          <MoodBubble mood={mood} size="lg" disabled />
        </View>
        <Text style={styles.phrase}>{MOOD_RESPONSES[moodId]}</Text>
        <View style={styles.ctaContainer}>
          <Button
            label="Continue"
            onPress={() => router.push('/(onboarding)/profile-personal')}
            fullWidth
          />
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
  phrase: {
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  ctaContainer: {
    marginTop: spacing.xl,
    alignSelf: 'stretch',
    marginHorizontal: spacing.md,
  },
});

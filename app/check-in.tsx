import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter, Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Screen } from '@components/index';
import { MoodBubble } from '@components/MoodBubble';
import { Shiba } from '@components/Shiba';
import { SparkleOverlay } from '@components/SparkleOverlay';
import { MOODS, MoodDefinition, MoodGroup } from '@constants/moods';
import { colors, typography, spacing } from '@constants/theme';

const GROUP_LABELS: Record<MoodGroup, string> = {
  green: 'Positive',
  neutral: 'Neutral',
  'red-orange': 'Intense',
  blue: 'Reflective',
};

const GROUP_ORDER: MoodGroup[] = ['green', 'neutral', 'red-orange', 'blue'];

function groupMoods(): { group: MoodGroup; label: string; moods: MoodDefinition[] }[] {
  return GROUP_ORDER.map((group) => ({
    group,
    label: GROUP_LABELS[group],
    moods: MOODS.filter((m) => m.group === group),
  }));
}

export default function MoodSelectionScreen() {
  const router = useRouter();
  const groups = groupMoods();

  const handleSelect = (mood: MoodDefinition) => {
    router.push(`/mood-confirm?moodId=${mood.id}` as Href);
  };

  return (
    <Screen scrollable={true} contentContainerStyle={styles.content}>
      <LinearGradient
        colors={[colors.skyStart, colors.skyEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroCard}
      >
        <SparkleOverlay count={20} />
        <View style={styles.sparkleRow}>
          <Ionicons name="sparkles" size={12} color={colors.textInverse} />
          <Text style={styles.sparkleText}>Daily Check-In</Text>
          <Ionicons name="star" size={12} color={colors.textInverse} />
        </View>
        <View style={styles.header}>
          <Text style={styles.title}>How are you feeling?</Text>
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Cancel"
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
        </View>

        <Text style={styles.subtitle}>
          Pick the mood that matches this moment.
        </Text>

        <View style={styles.heroMascotRow}>
          <Shiba variant="excited" size={94} floating />
          <View style={styles.heroHintChip}>
            <Text style={styles.heroHintText}>Daily check-in</Text>
          </View>
        </View>
      </LinearGradient>

      {groups.map(({ group, label, moods }) => (
        <View key={group} style={styles.groupSection}>
          <Text style={styles.groupLabel} accessibilityRole="header">
            {label} moods
          </Text>
          <View style={styles.bubbleRow}>
            {moods.map((mood) => (
              <MoodBubble
                key={mood.id}
                mood={mood}
                size="md"
                onPress={handleSelect}
              />
            ))}
          </View>
        </View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.lg,
  },
  heroCard: {
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  sparkleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    alignSelf: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  sparkleText: {
    color: colors.textInverse,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: typography.sizes.display,
    fontFamily: typography.fonts.display,
    color: colors.textInverse,
  },
  cancelText: {
    fontSize: typography.sizes.md,
    color: colors.textInverse,
    fontWeight: typography.weights.semibold,
  },
  subtitle: {
    fontSize: typography.sizes.body,
    color: colors.sparkle,
    lineHeight: 24,
  },
  heroMascotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroHintChip: {
    alignSelf: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderColor: 'rgba(255, 255, 255, 0.35)',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  heroHintText: {
    color: colors.textInverse,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
  },
  groupSection: {
    gap: spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 24,
    padding: spacing.md,
    borderWidth: 1.2,
    borderColor: '#DCE9FF',
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  groupLabel: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.ui,
    color: colors.primaryDark,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  bubbleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
});

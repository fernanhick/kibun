import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter, Href } from 'expo-router';
import { Screen } from '@components/index';
import { MoodBubble } from '@components/MoodBubble';
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

      {groups.map(({ group, label, moods }) => (
        <View key={group} style={styles.groupSection}>
          <Text style={styles.groupLabel} accessibilityRole="header">
            {label}
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
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
    gap: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  cancelText: {
    fontSize: typography.sizes.md,
    color: colors.primary,
    fontWeight: typography.weights.semibold,
  },
  groupSection: {
    gap: spacing.sm,
  },
  groupLabel: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  bubbleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
});

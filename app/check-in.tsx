import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams, Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
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

const MONTHS = ['January','February','March','April','May','June','July',
  'August','September','October','November','December'];

function formatBackdate(d: string) {
  const [, m, day] = d.split('-');
  return `${MONTHS[parseInt(m) - 1]} ${parseInt(day)}`;
}

export default function MoodSelectionScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ date?: string }>();
  const groups = groupMoods();

  const handleSelect = (mood: MoodDefinition) => {
    const dateParam = params.date ? `&date=${params.date}` : '';
    router.push(`/mood-confirm?moodId=${mood.id}${dateParam}` as Href);
  };

  return (
    <Screen scrollable={true} contentContainerStyle={styles.content}>
      <LinearGradient
        colors={[colors.skyStart, colors.skyEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroCard}
      >
        <View style={styles.header}>
          <Text style={styles.title}>How are you feeling?</Text>
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Cancel"
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="close" size={22} color={colors.textInverse} />
          </Pressable>
        </View>
        <Text style={styles.subtitle}>
          {params.date ? `Logging for ${formatBackdate(params.date)}` : 'Pick the mood that matches this moment.'}
        </Text>
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
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    gap: spacing.sm,
  },
  heroCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: typography.sizes.xxl,
    fontFamily: typography.fonts.display,
    color: colors.textInverse,
  },
  subtitle: {
    fontSize: typography.sizes.body,
    color: colors.sparkle,
  },
  groupSection: {
    gap: spacing.xs,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 16,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderWidth: 1,
    borderColor: '#DCE9FF',
  },
  groupLabel: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fonts.ui,
    color: colors.primaryDark,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  bubbleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
});

import { useEffect, useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Card, MoodBubble } from '@components/index';
import { useMoodEntryStore } from '@store/index';
import { MOOD_MAP, type MoodId } from '@constants/moods';
import { colors, spacing, typography } from '@constants/theme';
import type { MoodSlot } from '@models/index';

const SLOT_LABELS: Record<MoodSlot, string> = {
  morning: 'Morning',
  afternoon: 'Afternoon',
  night: 'Evening',
  pre_sleep: 'Night',
};

function formatDateHeading(dateStr: string): string {
  const date = new Date(dateStr + 'T12:00:00');
  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function DayDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ date: string }>();
  const dateParam = params.date;
  const isValidDate = !!dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam);

  // All hooks called unconditionally (Rules of Hooks).
  // Select stable reference, derive outside selector to avoid infinite loop.
  const allEntries = useMoodEntryStore((s) => s.entries);

  const entries = useMemo(
    () =>
      isValidDate
        ? allEntries
            .filter((e) => e.loggedAt.startsWith(dateParam))
            .sort((a, b) => a.loggedAt.localeCompare(b.loggedAt))
        : [],
    [allEntries, dateParam, isValidDate]
  );

  // Navigate back as side effect, not during render.
  useEffect(() => {
    if (!isValidDate) {
      router.back();
    }
  }, [isValidDate, router]);

  if (!isValidDate) {
    return null;
  }

  return (
    <Screen scrollable={true}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          accessibilityLabel="Go back"
          accessibilityRole="button"
          hitSlop={12}
        >
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.dateHeading} accessibilityRole="header">
          {formatDateHeading(dateParam)}
        </Text>
      </View>

      {entries.length === 0 ? (
        <Text style={styles.emptyText}>No moods logged on this day</Text>
      ) : (
        <View style={styles.entriesList}>
          {entries.map((entry) => {
            const entryMood = MOOD_MAP[entry.moodId as MoodId];
            return (
              <View
                key={entry.id}
                accessibilityLabel={`${entryMood?.label ?? entry.moodId} at ${formatTime(entry.loggedAt)}${entry.note ? `, ${entry.note}` : ''}`}
              >
                <Card>
                  <View style={styles.entryRow}>
                    {entryMood && (
                      <MoodBubble mood={entryMood} size="sm" />
                    )}
                    <View style={styles.entryInfo}>
                      <Text style={styles.moodLabel}>
                        {entryMood?.label ?? entry.moodId}
                      </Text>
                      <Text style={styles.timeLabel}>
                        {formatTime(entry.loggedAt)}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.slotLabel}>
                    {SLOT_LABELS[entry.slot]}
                  </Text>
                  {entry.note && (
                    <Text style={styles.noteText}>{entry.note}</Text>
                  )}
                </Card>
              </View>
            );
          })}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  dateHeading: {
    flex: 1,
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    color: colors.text,
  },
  emptyText: {
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: spacing.xl,
  },
  entriesList: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    paddingBottom: spacing.xl,
  },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  entryInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  moodLabel: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
    color: colors.text,
  },
  timeLabel: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
  },
  slotLabel: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    marginLeft: 48 + spacing.sm,
  },
  noteText: {
    fontSize: typography.sizes.sm,
    color: colors.text,
    marginTop: spacing.xs,
    marginLeft: 48 + spacing.sm,
    lineHeight: typography.sizes.sm * typography.lineHeights.normal,
  },
});

import { useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, Alert, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Card, MoodBubble } from '@components/index';
import { useMoodEntryStore } from '@store/index';
import { MOOD_MAP, type MoodId } from '@constants/moods';
import { colors, spacing, typography, radius } from '@constants/theme';
import type { MoodSlot, SentimentLabel } from '@models/index';

const SLOT_LABELS: Record<MoodSlot, string> = {
  morning: 'Morning',
  afternoon: 'Afternoon',
  night: 'Evening',
  pre_sleep: 'Night',
};

const SENTIMENT_DISPLAY: Record<SentimentLabel, { emoji: string; label: string }> = {
  positive: { emoji: '😊', label: 'Positive' },
  neutral:  { emoji: '😐', label: 'Neutral' },
  negative: { emoji: '😔', label: 'Difficult' },
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

  const [expandedId, setExpandedId] = useState<string | null>(null);

  const allEntries = useMoodEntryStore((s) => s.entries);
  const deleteEntry = useMoodEntryStore((s) => s.deleteEntry);

  const entries = useMemo(
    () =>
      isValidDate
        ? allEntries
            .filter((e) => e.loggedAt.startsWith(dateParam))
            .sort((a, b) => a.loggedAt.localeCompare(b.loggedAt))
        : [],
    [allEntries, dateParam, isValidDate]
  );

  useEffect(() => {
    if (!isValidDate) {
      router.back();
    }
  }, [isValidDate, router]);

  if (!isValidDate) {
    return null;
  }

  const handleDelete = (entryId: string, moodLabel: string) => {
    Alert.alert(
      'Delete entry',
      `Are you sure you want to delete this "${moodLabel}" entry? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteEntry(entryId);
            setExpandedId(null);
          },
        },
      ]
    );
  };

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
            const isExpanded = expandedId === entry.id;
            const sentiment = entry.sentimentLabel
              ? SENTIMENT_DISPLAY[entry.sentimentLabel]
              : null;

            return (
              <Pressable
                key={entry.id}
                onPress={() => setExpandedId(isExpanded ? null : entry.id)}
                accessibilityLabel={`${entryMood?.label ?? entry.moodId} at ${formatTime(entry.loggedAt)}${entry.note ? `, ${entry.note}` : ''}. Tap to ${isExpanded ? 'collapse' : 'expand'}.`}
                accessibilityRole="button"
              >
                <Card style={isExpanded ? styles.cardExpanded : undefined}>
                  <View style={styles.entryRow}>
                    {entryMood && (
                      <MoodBubble mood={entryMood} size="sm" />
                    )}
                    <View style={styles.entryInfo}>
                      <View style={styles.moodChip}>
                        <Ionicons name="sparkles" size={12} color={colors.primaryDark} />
                        <Text style={styles.moodLabel}>
                          {entryMood?.label ?? entry.moodId}
                        </Text>
                      </View>
                      <View style={styles.timeRow}>
                        <Text style={styles.timeLabel}>
                          {formatTime(entry.loggedAt)}
                        </Text>
                        <Ionicons
                          name={isExpanded ? 'chevron-up' : 'chevron-down'}
                          size={16}
                          color={colors.textSecondary}
                        />
                      </View>
                    </View>
                  </View>

                  <Text style={styles.slotLabel}>
                    {SLOT_LABELS[entry.slot]}
                  </Text>

                  {isExpanded && (
                    <View style={styles.expandedSection}>
                      {entry.note ? (
                        <View style={styles.detailBlock}>
                          <Text style={styles.detailLabel}>Note</Text>
                          <Text style={styles.detailText}>{entry.note}</Text>
                        </View>
                      ) : (
                        <View style={styles.detailBlock}>
                          <Text style={styles.detailTextMuted}>No note added</Text>
                        </View>
                      )}

                      {sentiment && (
                        <View style={styles.detailBlock}>
                          <Text style={styles.detailLabel}>Sentiment</Text>
                          <View style={styles.sentimentRow}>
                            <Text style={styles.sentimentEmoji}>{sentiment.emoji}</Text>
                            <Text style={styles.detailText}>{sentiment.label}</Text>
                          </View>
                        </View>
                      )}

                      {entry.journalPrompt && (
                        <View style={styles.detailBlock}>
                          <Text style={styles.detailLabel}>Journal prompt</Text>
                          <Text style={styles.detailTextItalic}>{entry.journalPrompt}</Text>
                        </View>
                      )}

                      {entry.journalResponse && (
                        <View style={styles.detailBlock}>
                          <Text style={styles.detailLabel}>Your reflection</Text>
                          <Text style={styles.detailText}>{entry.journalResponse}</Text>
                        </View>
                      )}

                      <Pressable
                        onPress={() => handleDelete(entry.id, entryMood?.label ?? entry.moodId)}
                        style={styles.deleteButton}
                        accessibilityLabel="Delete this entry"
                        accessibilityRole="button"
                      >
                        <Ionicons name="trash-outline" size={16} color={colors.error} />
                        <Text style={styles.deleteText}>Delete entry</Text>
                      </Pressable>
                    </View>
                  )}
                </Card>
              </Pressable>
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
    fontFamily: typography.fonts.ui,
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
  cardExpanded: {
    borderColor: colors.primary,
    borderWidth: 1.5,
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
  moodChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EEF4FF',
    borderWidth: 1,
    borderColor: '#D6E4FF',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  moodLabel: {
    fontSize: typography.sizes.body,
    fontFamily: typography.fonts.ui,
    color: colors.text,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeLabel: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
  },
  slotLabel: {
    alignSelf: 'flex-start',
    fontSize: typography.sizes.xs,
    color: colors.primaryDark,
    marginTop: spacing.xs,
    marginLeft: 48 + spacing.sm,
    backgroundColor: '#FFF4DF',
    borderWidth: 1,
    borderColor: '#FFE2B1',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  expandedSection: {
    marginTop: spacing.md,
    marginLeft: 48 + spacing.sm,
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: '#E8EDF5',
    paddingTop: spacing.md,
  },
  detailBlock: {
    gap: 4,
  },
  detailLabel: {
    fontSize: typography.sizes.xs,
    color: colors.primaryDark,
    fontWeight: typography.weights.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  detailText: {
    fontSize: typography.sizes.sm,
    color: colors.text,
    lineHeight: typography.sizes.sm * typography.lineHeights.normal,
  },
  detailTextMuted: {
    fontSize: typography.sizes.sm,
    color: colors.textDisabled,
    fontStyle: 'italic',
  },
  detailTextItalic: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    fontStyle: 'italic',
    lineHeight: typography.sizes.sm * typography.lineHeights.normal,
  },
  sentimentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sentimentEmoji: {
    fontSize: 14,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    marginTop: spacing.sm,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: radius.lg,
    backgroundColor: '#FFF0F0',
    borderWidth: 1,
    borderColor: '#FFCDD2',
  },
  deleteText: {
    fontSize: typography.sizes.sm,
    color: colors.error,
    fontWeight: typography.weights.medium,
  },
});

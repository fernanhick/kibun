import { useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, Alert, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Card, MoodBubble, BackButton } from '@components/index';
import { useMoodEntryStore, useLifeEventsStore } from '@store/index';
import { MOOD_MAP, type MoodId } from '@constants/moods';
import { colors, spacing, typography, radius } from '@constants/theme';
import type { MoodSlot, SentimentLabel, LifeEventCategory } from '@models/index';

const SLOT_LABELS: Record<MoodSlot, string> = {
  morning: 'Morning',
  afternoon: 'Afternoon',
  night: 'Evening',
  pre_sleep: 'Night',
};

const EVENT_CATEGORY_CONFIG: Record<LifeEventCategory, { emoji: string; label: string; color: string }> = {
  work:         { emoji: '💼', label: 'Work',         color: '#5C7CFA' },
  social:       { emoji: '👥', label: 'Social',       color: '#F06595' },
  health:       { emoji: '🏥', label: 'Health',       color: '#51CF66' },
  travel:       { emoji: '✈️', label: 'Travel',       color: '#339AF0' },
  relationship: { emoji: '❤️', label: 'Relationship', color: '#FF6B6B' },
  personal:     { emoji: '🌟', label: 'Personal',     color: '#CC5DE8' },
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
  const allEvents = useLifeEventsStore((s) => s.events);
  const deleteEvent = useLifeEventsStore((s) => s.deleteEvent);

  const entries = useMemo(
    () =>
      isValidDate
        ? allEntries
            .filter((e) => e.loggedAt.startsWith(dateParam))
            .sort((a, b) => a.loggedAt.localeCompare(b.loggedAt))
        : [],
    [allEntries, dateParam, isValidDate]
  );

  const dayEvents = useMemo(
    () => (isValidDate ? allEvents.filter((e) => e.eventDate === dateParam) : []),
    [allEvents, dateParam, isValidDate]
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
    <Screen scrollable={true} layout="wide">
      <View style={styles.header}>
        <BackButton />
        <Text style={styles.dateHeading} accessibilityRole="header">
          {formatDateHeading(dateParam)}
        </Text>
      </View>

      {dayEvents.length > 0 && (
        <View style={styles.eventsSection}>
          <Text style={styles.eventsSectionLabel}>Life Events</Text>
          {dayEvents.map((event) => {
            const cfg = EVENT_CATEGORY_CONFIG[event.category as LifeEventCategory];
            return (
              <View key={event.id} style={[styles.eventCard, { borderLeftColor: cfg.color }]}>
                <View style={styles.eventRow}>
                  <Text style={styles.eventEmoji}>{cfg.emoji}</Text>
                  <View style={styles.eventInfo}>
                    <Text style={styles.eventTitle}>{event.title}</Text>
                    <Text style={styles.eventCategory}>{cfg.label}</Text>
                  </View>
                  <Pressable
                    onPress={() => {
                      Alert.alert('Delete event', `Delete "${event.title}"?`, [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Delete', style: 'destructive', onPress: () => deleteEvent(event.id) },
                      ]);
                    }}
                    hitSlop={8}
                    accessibilityLabel="Delete event"
                  >
                    <Ionicons name="trash-outline" size={16} color={colors.textDisabled} />
                  </Pressable>
                </View>
                {event.notes ? <Text style={styles.eventNotes}>{event.notes}</Text> : null}
              </View>
            );
          })}
        </View>
      )}

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

                      {(entry.energyLevel != null || entry.focusLevel != null) && (
                        <View style={styles.detailBlock}>
                          <Text style={styles.detailLabel}>Energy & Focus</Text>
                          <View style={styles.efRow}>
                            {entry.energyLevel != null && (
                              <View style={styles.efChip}>
                                <Text style={styles.efChipEmoji}>⚡</Text>
                                <Text style={styles.efChipText}>Energy {entry.energyLevel}/5</Text>
                              </View>
                            )}
                            {entry.focusLevel != null && (
                              <View style={styles.efChip}>
                                <Text style={styles.efChipEmoji}>🎯</Text>
                                <Text style={styles.efChipText}>Focus {entry.focusLevel}/5</Text>
                              </View>
                            )}
                          </View>
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
          <Pressable
            onPress={() => router.push(`/check-in?date=${dateParam}` as Href)}
            style={styles.logAnotherBtn}
            accessibilityRole="button"
            accessibilityLabel="Log another mood for this day"
          >
            <Ionicons name="add-circle-outline" size={18} color={colors.primaryDark} />
            <Text style={styles.logAnotherText}>Log another mood</Text>
          </Pressable>
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
  eventsSection: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  eventsSectionLabel: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    color: colors.primaryDark,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  eventCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8EDF5',
    borderLeftWidth: 3,
    padding: spacing.sm,
    gap: 4,
  },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  eventEmoji: {
    fontSize: 18,
  },
  eventInfo: {
    flex: 1,
  },
  eventTitle: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
    color: colors.text,
  },
  eventCategory: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    marginTop: 1,
  },
  eventNotes: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    marginLeft: 30,
    lineHeight: 18,
  },
  efRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: 2,
  },
  efChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F0F7FF',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#C8DCFF',
  },
  efChipEmoji: {
    fontSize: 12,
  },
  efChipText: {
    fontSize: typography.sizes.xs,
    color: colors.text,
    fontWeight: typography.weights.medium,
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
  logAnotherBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: spacing.xs,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: '#C6DBFF',
  },
  logAnotherText: {
    fontSize: typography.sizes.body,
    fontFamily: typography.fonts.ui,
    color: colors.primaryDark,
    fontWeight: typography.weights.medium,
  },
});

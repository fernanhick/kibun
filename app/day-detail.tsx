import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, Alert, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Card, MoodBubble, BackButton } from '@components/index';
import { useMoodEntryStore, useLifeEventsStore } from '@store/index';
import { useCustomMoodsStore } from '@store/customMoodsStore';
import { getMoodLabel } from '@lib/moodLabels';
import { getMoodDef } from '@lib/moodUtils';
import { safeParseDateString } from '@lib/safeDate';
import { formatDate, formatTime as formatTimeFn } from '@i18n/dateFormat';
import { spacing, typography, radius } from '@constants/theme';
import { useTheme, type ThemePalette } from '@theme/ThemeContext';
import { useThemedStyles } from '@hooks/useThemedStyles';
import type { MoodSlot, SentimentLabel, LifeEventCategory } from '@models/index';

const EVENT_CATEGORY_CONFIG: Record<
  LifeEventCategory,
  { icon: React.ComponentProps<typeof Ionicons>['name']; color: string }
> = {
  work:         { icon: 'briefcase',   color: '#5C7CFA' },
  social:       { icon: 'people',      color: '#F06595' },
  health:       { icon: 'medkit',      color: '#51CF66' },
  travel:       { icon: 'airplane',    color: '#339AF0' },
  relationship: { icon: 'heart',       color: '#FF6B6B' },
  personal:     { icon: 'star',        color: '#CC5DE8' },
};

const SENTIMENT_IMAGES: Record<SentimentLabel, any> = {
  positive: require('../assets/emotions/happy.png'),
  neutral:  require('../assets/emotions/calm.png'),
  negative: require('../assets/emotions/sad.png'),
};

const SLOT_KEYS: Record<MoodSlot, 'morning' | 'afternoon' | 'night' | 'pre_sleep'> = {
  morning: 'morning',
  afternoon: 'afternoon',
  night: 'night',
  pre_sleep: 'pre_sleep',
};

export default function DayDetailScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const { t } = useTranslation('screens');
  const params = useLocalSearchParams<{ date: string }>();
  const dateParam = params.date;
  const isValidDate = !!dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam);

  const [expandedId, setExpandedId] = useState<string | null>(null);

  const allEntries = useMoodEntryStore((s) => s.entries);
  const deleteEntry = useMoodEntryStore((s) => s.deleteEntry);
  const allEvents = useLifeEventsStore((s) => s.events);
  const deleteEvent = useLifeEventsStore((s) => s.deleteEvent);
  const customMoods = useCustomMoodsStore((s) => s.moods);

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
      t('dayDetail.deleteEntryTitle'),
      t('dayDetail.deleteEntryMessage', { moodLabel }),
      [
        { text: t('common:actions.cancel'), style: 'cancel' },
        {
          text: t('dayDetail.deleteAction'),
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
          <Text style={styles.eventsSectionLabel}>{t('dayDetail.lifeEvents')}</Text>
          {dayEvents.map((event) => {
            const cfg = EVENT_CATEGORY_CONFIG[event.category as LifeEventCategory];
            const categoryLabel = t(`event.category.${event.category}`);
            return (
              <View key={event.id} style={[styles.eventCard, { borderLeftColor: cfg.color }]}>
                <View style={styles.eventRow}>
                  <Ionicons name={cfg.icon} size={20} color={cfg.color} style={styles.eventIcon} />
                  <View style={styles.eventInfo}>
                    <Text style={styles.eventTitle}>{event.title}</Text>
                    <Text style={styles.eventCategory}>{categoryLabel}</Text>
                  </View>
                  <Pressable
                    onPress={() => {
                      Alert.alert(t('dayDetail.deleteEventTitle'), t('dayDetail.deleteEventMessage', { title: event.title }), [
                        { text: t('common:actions.cancel'), style: 'cancel' },
                        { text: t('dayDetail.deleteAction'), style: 'destructive', onPress: () => deleteEvent(event.id) },
                      ]);
                    }}
                    hitSlop={8}
                    accessibilityLabel={t('dayDetail.deleteEventA11y')}
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
        <Text style={styles.emptyText}>{t('dayDetail.empty')}</Text>
      ) : (
        <View style={styles.entriesList}>
          {entries.map((entry) => {
            const entryMood = getMoodDef(entry.moodId, customMoods);
            const moodLabel = getMoodLabel(entry.moodId, customMoods);
            const isExpanded = expandedId === entry.id;
            const sentimentLabel = entry.sentimentLabel
              ? t(`dayDetail.sentiment.${entry.sentimentLabel}`)
              : null;

            return (
              <Pressable
                key={entry.id}
                onPress={() => setExpandedId(isExpanded ? null : entry.id)}
                accessibilityLabel={t('dayDetail.entryA11y', {
                  mood: moodLabel,
                  time: formatTimeFn(entry.loggedAt),
                  note: entry.note ? `, ${entry.note}` : '',
                  action: isExpanded ? t('dayDetail.collapse') : t('dayDetail.expand'),
                })}
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
                          {moodLabel}
                        </Text>
                      </View>
                      <View style={styles.timeRow}>
                        <Text style={styles.timeLabel}>
                          {formatTimeFn(entry.loggedAt)}
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
                    {t(`dayDetail.slot.${SLOT_KEYS[entry.slot]}`)}
                  </Text>

                  {isExpanded && (
                    <View style={styles.expandedSection}>
                      {entry.note ? (
                        <View style={styles.detailBlock}>
                          <Text style={styles.detailLabel}>{t('dayDetail.note')}</Text>
                          <Text style={styles.detailText}>{entry.note}</Text>
                        </View>
                      ) : (
                        <View style={styles.detailBlock}>
                          <Text style={styles.detailTextMuted}>{t('dayDetail.noNote')}</Text>
                        </View>
                      )}

                      {sentimentLabel && entry.sentimentLabel && (
                        <View style={styles.detailBlock}>
                          <Text style={styles.detailLabel}>{t('dayDetail.sentimentLabel')}</Text>
                          <View style={styles.sentimentRow}>
                            <Image
                              source={SENTIMENT_IMAGES[entry.sentimentLabel]}
                              style={styles.sentimentImage}
                              contentFit="contain"
                              accessibilityIgnoresInvertColors
                            />
                            <Text style={styles.detailText}>{sentimentLabel}</Text>
                          </View>
                        </View>
                      )}

                      {entry.journalPrompt && (
                        <View style={styles.detailBlock}>
                          <Text style={styles.detailLabel}>{t('dayDetail.journalPrompt')}</Text>
                          <Text style={styles.detailTextItalic}>{entry.journalPrompt}</Text>
                        </View>
                      )}

                      {entry.journalResponse && (
                        <View style={styles.detailBlock}>
                          <Text style={styles.detailLabel}>{t('dayDetail.yourReflection')}</Text>
                          <Text style={styles.detailText}>{entry.journalResponse}</Text>
                        </View>
                      )}

                      {(entry.energyLevel != null || entry.focusLevel != null) && (
                        <View style={styles.detailBlock}>
                          <Text style={styles.detailLabel}>{t('dayDetail.energyFocus')}</Text>
                          <View style={styles.efRow}>
                            {entry.energyLevel != null && (
                              <View style={styles.efChip}>
                                <Ionicons name="flash" size={14} color={colors.accent} />
                                <Text style={styles.efChipText}>{t('dayDetail.energyValue', { value: entry.energyLevel })}</Text>
                              </View>
                            )}
                            {entry.focusLevel != null && (
                              <View style={styles.efChip}>
                                <Ionicons name="locate" size={14} color={colors.primary} />
                                <Text style={styles.efChipText}>{t('dayDetail.focusValue', { value: entry.focusLevel })}</Text>
                              </View>
                            )}
                          </View>
                        </View>
                      )}

                      <Pressable
                        onPress={() => handleDelete(entry.id, moodLabel)}
                        style={styles.deleteButton}
                        accessibilityLabel={t('dayDetail.deleteEntryA11y')}
                        accessibilityRole="button"
                      >
                        <Ionicons name="trash-outline" size={16} color={colors.error} />
                        <Text style={styles.deleteText}>{t('dayDetail.deleteEntryAction')}</Text>
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
            accessibilityLabel={t('dayDetail.logAnotherA11y')}
          >
            <Ionicons name="add-circle-outline" size={18} color={colors.primaryDark} />
            <Text style={styles.logAnotherText}>{t('dayDetail.logAnother')}</Text>
          </Pressable>
        </View>
      )}
    </Screen>
  );
}

function formatDateHeading(isoDate: string): string {
  const date = safeParseDateString(isoDate);
  return formatDate(date, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

const createStyles = (colors: ThemePalette) => StyleSheet.create({
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
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.border,
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
    backgroundColor: colors.warningLight,
    borderWidth: 1,
    borderColor: colors.warningBorder,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  expandedSection: {
    marginTop: spacing.md,
    marginLeft: 48 + spacing.sm,
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
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
  sentimentImage: {
    width: 22,
    height: 22,
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
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 3,
    padding: spacing.sm,
    gap: 4,
  },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  eventIcon: {
    width: 22,
    textAlign: 'center',
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
    backgroundColor: colors.primaryLight,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: colors.border,
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
    backgroundColor: colors.errorLight,
    borderWidth: 1,
    borderColor: colors.errorBorder,
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
    borderColor: colors.border,
  },
  logAnotherText: {
    fontSize: typography.sizes.body,
    fontFamily: typography.fonts.ui,
    color: colors.primaryDark,
    fontWeight: typography.weights.medium,
  },
});

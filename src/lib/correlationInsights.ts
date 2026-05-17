import type { TFunction } from 'i18next';
import { MOOD_MAP } from '@constants/moods';
import { GROUP_SCORES } from '@lib/insights';
import { computeHabitCorrelations } from '@lib/correlations';
import type { Habit, HabitLog, MoodEntry } from '@models/index';

export type InsightCardKind = 'positiveCorrelation' | 'lowMoodNudge';

export interface InsightCard {
  kind: InsightCardKind;
  title: string;
  body: string;
  habitId?: string;
  emoji: string;
}

// Stricter than the Insights tab floor: insight cards are unsolicited, so they
// need higher confidence before surfacing.
const POSITIVE_CORRELATION_MIN_R = 0.3;
const POSITIVE_CORRELATION_MIN_SAMPLES = 7;

// Today's avg group score at or below this threshold counts as "skewed low".
// GROUP_SCORES: green=4, neutral=3, blue=2, red-orange=1.
const LOW_MOOD_THRESHOLD = 2;

function strengthAdverb(r: number): 'weak' | 'moderate' | 'strong' {
  const abs = Math.abs(r);
  if (abs >= 0.5) return 'strong';
  if (abs >= 0.3) return 'moderate';
  return 'weak';
}

export function generatePositiveCorrelationInsight(
  habits: Habit[],
  habitLogs: HabitLog[],
  moodEntries: MoodEntry[],
  t: TFunction,
): InsightCard | null {
  if (habits.length === 0 || habitLogs.length === 0 || moodEntries.length === 0) return null;

  const correlations = computeHabitCorrelations(habits, habitLogs, moodEntries);
  const qualifying = correlations.filter(
    (c) => c.correlation >= POSITIVE_CORRELATION_MIN_R && c.sampleSize >= POSITIVE_CORRELATION_MIN_SAMPLES,
  );
  if (qualifying.length === 0) return null;

  const top = qualifying[0];
  const strength = t(`home.insightCards.strength.${strengthAdverb(top.correlation)}`);
  return {
    kind: 'positiveCorrelation',
    emoji: t('home.insightCards.positiveCorrelation.emoji'),
    title: t('home.insightCards.positiveCorrelation.title', { habit: top.habit.name }),
    body: t('home.insightCards.positiveCorrelation.body', { habit: top.habit.name, strength }),
    habitId: top.habit.id,
  };
}

export function generateLowMoodNudgeInsight(
  habits: Habit[],
  habitLogs: HabitLog[],
  moodEntries: MoodEntry[],
  today: string,
  t: TFunction,
): InsightCard | null {
  if (habits.length === 0) return null;

  const todaysEntries = moodEntries.filter((e) => e.loggedAt.startsWith(today));
  if (todaysEntries.length === 0) return null;

  const scores = todaysEntries.map((e) => {
    const mood = MOOD_MAP[e.moodId as keyof typeof MOOD_MAP];
    return mood ? GROUP_SCORES[mood.group] : 3;
  });
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  if (avg > LOW_MOOD_THRESHOLD) return null;

  const todaysHabitLogs = habitLogs.filter((l) => l.logDate === today);
  if (todaysHabitLogs.length > 0) return null;

  // Try a personalised suggestion: top positive correlation with enough confidence.
  const correlations = computeHabitCorrelations(habits, habitLogs, moodEntries);
  const personalised = correlations.find(
    (c) => c.correlation >= POSITIVE_CORRELATION_MIN_R && c.sampleSize >= POSITIVE_CORRELATION_MIN_SAMPLES,
  );

  if (personalised) {
    return {
      kind: 'lowMoodNudge',
      emoji: t('home.insightCards.lowMoodNudge.emoji'),
      title: t('home.insightCards.lowMoodNudge.personalisedTitle', { habit: personalised.habit.name }),
      body: t('home.insightCards.lowMoodNudge.personalisedBody', { habit: personalised.habit.name }),
      habitId: personalised.habit.id,
    };
  }

  // Cold-start fallback: pick the first habit by displayOrder for navigation,
  // but use generic copy that doesn't reference it by name.
  const fallback = [...habits].sort((a, b) => a.displayOrder - b.displayOrder)[0];
  return {
    kind: 'lowMoodNudge',
    emoji: t('home.insightCards.lowMoodNudge.emoji'),
    title: t('home.insightCards.lowMoodNudge.genericTitle'),
    body: t('home.insightCards.lowMoodNudge.genericBody'),
    habitId: fallback?.id,
  };
}

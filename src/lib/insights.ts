import { MoodEntry } from '@models/index';
import { MOOD_MAP, type MoodGroup } from '@constants/moods';

// Numeric mood scoring for trend calculations.
// Higher = more positive. Used by getDailyMoodScores and Plan 07-02 pattern detection.
export const GROUP_SCORES: Record<MoodGroup, number> = {
  green: 4,
  neutral: 3,
  blue: 2,
  'red-orange': 1,
};

/**
 * Filter entries to the last N days using UTC-consistent comparison.
 * Does NOT use setHours(0,0,0,0) — that sets local midnight, but loggedAt
 * is stored via toISOString() (UTC). Lexicographic ISO comparison is correct.
 */
export function filterEntriesByDays(entries: MoodEntry[], days: number): MoodEntry[] {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffStr = cutoff.toISOString();
  return entries.filter((e) => e.loggedAt >= cutoffStr);
}

export interface MoodFrequencyItem {
  moodId: string;
  label: string;
  color: string;
  count: number;
}

/**
 * Count mood occurrences, sorted by frequency descending.
 * Defensive: unknown moodIds get fallback label and color.
 */
export function getMoodFrequency(entries: MoodEntry[]): MoodFrequencyItem[] {
  const counts: Record<string, number> = {};
  for (const e of entries) {
    counts[e.moodId] = (counts[e.moodId] ?? 0) + 1;
  }

  const result: MoodFrequencyItem[] = Object.entries(counts).map(([moodId, count]) => {
    const mood = MOOD_MAP[moodId as keyof typeof MOOD_MAP];
    return {
      moodId,
      label: mood?.label ?? moodId,
      color: mood?.bubbleColor ?? '#BDBDBD',
      count,
    };
  });

  result.sort((a, b) => b.count - a.count);
  return result;
}

export interface DailyMoodScore {
  date: string;
  score: number;
  label: string;
}

/**
 * Compute daily average mood score for a line chart.
 * Groups by UTC date, maps each entry's mood group to GROUP_SCORES, averages per day.
 * Sorted ascending by date (chronological for chart rendering).
 */
export function getDailyMoodScores(entries: MoodEntry[]): DailyMoodScore[] {
  const byDate: Record<string, number[]> = {};
  for (const e of entries) {
    const date = e.loggedAt.split('T')[0];
    const mood = MOOD_MAP[e.moodId as keyof typeof MOOD_MAP];
    const score = mood ? GROUP_SCORES[mood.group] : 3; // default neutral if unknown
    (byDate[date] ??= []).push(score);
  }

  const result: DailyMoodScore[] = Object.entries(byDate)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, scores]) => {
      const avg = scores.reduce((sum, s) => sum + s, 0) / scores.length;
      // Format label as short date: "Apr 3" style
      const [, month, day] = date.split('-');
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const label = `${monthNames[parseInt(month, 10) - 1]} ${parseInt(day, 10)}`;
      return { date, score: Math.round(avg * 10) / 10, label };
    });

  return result;
}

import { MoodEntry } from '@models/index';
import { MOOD_MAP, type MoodGroup } from '@constants/moods';
import { getMoodLabel } from '@lib/moodLabels';
import { formatDate } from '@i18n/dateFormat';

// Numeric mood scoring for trend calculations.
// Higher = more positive. Used by getDailyMoodScores and Plan 07-02 pattern detection.
export const GROUP_SCORES: Record<MoodGroup, number> = {
  green: 4,
  neutral: 3,
  blue: 2,
  'red-orange': 1,
};

// Build a YYYY-MM-DD key from an ISO timestamp using the user's local time.
// loggedAt is stored as UTC via toISOString(); splitting on 'T' would group by
// UTC date, which causes evening entries (in negative-offset zones) or morning
// entries (in positive-offset zones) to land on the wrong calendar day.
function localDateKey(iso: string): string {
  const d = new Date(iso);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

// Generate the last N local-calendar dates, oldest → newest, as YYYY-MM-DD.
function localDateRange(days: number): string[] {
  const out: string[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    out.push(`${yyyy}-${mm}-${dd}`);
  }
  return out;
}

/**
 * Filter entries to the last N local calendar days (inclusive of today).
 * Cutoff is the start of (today - days + 1) in the user's local timezone,
 * converted to ISO for lexicographic comparison against loggedAt.
 */
export function filterEntriesByDays(entries: MoodEntry[], days: number): MoodEntry[] {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (days - 1));
  const cutoffStr = start.toISOString();
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
      label: getMoodLabel(moodId),
      color: mood?.bubbleColor ?? '#BDBDBD',
      count,
    };
  });

  result.sort((a, b) => b.count - a.count);
  return result;
}

export interface DailyMoodScore {
  date: string;
  score: number | null;
  label: string;
}

function formatLabel(date: string): string {
  const [year, month, day] = date.split('-');
  // Use a noon timestamp to avoid timezone-edge dates landing on the wrong day.
  const d = new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10), 12);
  return formatDate(d, { month: 'short', day: 'numeric' });
}

/**
 * Compute daily average mood score for a line chart.
 * Groups entries by local calendar date and averages per day.
 *
 * When `days` is provided, the result spans the full N-day window (oldest →
 * newest, including today), with `score: null` for days that have no entries.
 * Without `days`, only days with entries are returned (legacy callers).
 */
export function getDailyMoodScores(entries: MoodEntry[], days?: number): DailyMoodScore[] {
  const byDate: Record<string, number[]> = {};
  for (const e of entries) {
    const date = localDateKey(e.loggedAt);
    const mood = MOOD_MAP[e.moodId as keyof typeof MOOD_MAP];
    const score = mood ? GROUP_SCORES[mood.group] : 3; // default neutral if unknown
    (byDate[date] ??= []).push(score);
  }

  const dateKeys = days
    ? localDateRange(days)
    : Object.keys(byDate).sort((a, b) => a.localeCompare(b));

  return dateKeys.map((date) => {
    const scores = byDate[date];
    const label = formatLabel(date);
    if (!scores || scores.length === 0) {
      return { date, score: null, label };
    }
    const avg = scores.reduce((sum, s) => sum + s, 0) / scores.length;
    return { date, score: Math.round(avg * 10) / 10, label };
  });
}

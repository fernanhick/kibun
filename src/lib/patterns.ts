import { MoodEntry, MoodSlot } from '@models/index';
import { MOOD_MAP } from '@constants/moods';
import { GROUP_SCORES } from '@lib/insights';

export interface PatternFlag {
  id: string;
  icon: string;
  text: string;
  type: 'day-of-week' | 'time-of-day' | 'trend';
}

const SLOT_LABELS: Record<MoodSlot, string> = {
  morning: 'the morning',
  afternoon: 'the afternoon',
  night: 'the evening',
  pre_sleep: 'before sleep',
};

const DAY_LABELS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

export function detectDayOfWeekPatterns(entries: MoodEntry[]): PatternFlag[] {
  const total = entries.length;
  if (total === 0) return [];

  // Count entries per moodId and per day
  const moodCounts: Record<string, number> = {};
  const dayTotals: Record<number, number> = {};
  const moodDayCounts: Record<string, Record<number, number>> = {};

  for (const e of entries) {
    moodCounts[e.moodId] = (moodCounts[e.moodId] ?? 0) + 1;
    const day = new Date(e.loggedAt).getDay();
    dayTotals[day] = (dayTotals[day] ?? 0) + 1;
    const moodDay = (moodDayCounts[e.moodId] ??= {});
    moodDay[day] = (moodDay[day] ?? 0) + 1;
  }

  const candidates: { flag: PatternFlag; ratio: number }[] = [];

  for (const [moodId, moodTotal] of Object.entries(moodCounts)) {
    const overallFreq = moodTotal / total;
    const mood = MOOD_MAP[moodId as keyof typeof MOOD_MAP];
    if (!mood) continue;

    const dayMap = moodDayCounts[moodId] ?? {};
    for (let day = 0; day < 7; day++) {
      const countOnDay = dayMap[day] ?? 0;
      const totalOnDay = dayTotals[day] ?? 0;
      // Guard: skip days with 0 total entries to prevent division by zero
      if (totalOnDay === 0) continue;
      if (countOnDay < 3) continue;

      const dayFreq = countOnDay / totalOnDay;
      const ratio = dayFreq / overallFreq;
      if (ratio >= 1.5) {
        candidates.push({
          flag: {
            id: `dow-${moodId}-${day}`,
            icon: '\u{1F4C5}',
            text: `You often feel ${mood.label} on ${DAY_LABELS[day]}s`,
            type: 'day-of-week',
          },
          ratio,
        });
      }
    }
  }

  candidates.sort((a, b) => b.ratio - a.ratio);
  return candidates.slice(0, 2).map((c) => c.flag);
}

export function detectTimeOfDayPatterns(entries: MoodEntry[]): PatternFlag[] {
  const total = entries.length;
  if (total === 0) return [];

  const moodCounts: Record<string, number> = {};
  const slotTotals: Record<string, number> = {};
  const moodSlotCounts: Record<string, Record<string, number>> = {};

  for (const e of entries) {
    moodCounts[e.moodId] = (moodCounts[e.moodId] ?? 0) + 1;
    slotTotals[e.slot] = (slotTotals[e.slot] ?? 0) + 1;
    const moodSlot = (moodSlotCounts[e.moodId] ??= {});
    moodSlot[e.slot] = (moodSlot[e.slot] ?? 0) + 1;
  }

  const candidates: { flag: PatternFlag; ratio: number }[] = [];

  for (const [moodId, moodTotal] of Object.entries(moodCounts)) {
    const overallFreq = moodTotal / total;
    const mood = MOOD_MAP[moodId as keyof typeof MOOD_MAP];
    if (!mood) continue;

    const slotMap = moodSlotCounts[moodId] ?? {};
    for (const slot of Object.keys(slotTotals)) {
      const countInSlot = slotMap[slot] ?? 0;
      const totalInSlot = slotTotals[slot] ?? 0;
      // Guard: skip slots with 0 total entries to prevent division by zero
      if (totalInSlot === 0) continue;
      if (countInSlot < 3) continue;

      const slotFreq = countInSlot / totalInSlot;
      const ratio = slotFreq / overallFreq;
      if (ratio >= 1.5) {
        candidates.push({
          flag: {
            id: `tod-${moodId}-${slot}`,
            icon: '\u{1F550}',
            text: `You tend to feel ${mood.label} in ${SLOT_LABELS[slot as MoodSlot]}`,
            type: 'time-of-day',
          },
          ratio,
        });
      }
    }
  }

  candidates.sort((a, b) => b.ratio - a.ratio);
  return candidates.slice(0, 2).map((c) => c.flag);
}

export function detectTrendPattern(entries: MoodEntry[]): PatternFlag | null {
  if (entries.length < 2) return null;

  // Sort ascending by loggedAt — store prepends (reverse-chronological)
  const sorted = [...entries].sort((a, b) => a.loggedAt.localeCompare(b.loggedAt));
  const mid = Math.floor(sorted.length / 2);
  const firstHalf = sorted.slice(0, mid);
  const secondHalf = sorted.slice(mid);

  const avgScore = (list: MoodEntry[]) => {
    if (list.length === 0) return 0;
    let sum = 0;
    for (const e of list) {
      const mood = MOOD_MAP[e.moodId as keyof typeof MOOD_MAP];
      sum += mood ? GROUP_SCORES[mood.group] : 3;
    }
    return sum / list.length;
  };

  const firstAvg = avgScore(firstHalf);
  const secondAvg = avgScore(secondHalf);
  const diff = secondAvg - firstAvg;

  if (diff >= 0.5) {
    return {
      id: 'trend',
      icon: '\u{1F4C8}',
      text: 'Your mood has been improving lately \u{1F331}',
      type: 'trend',
    };
  }

  if (diff <= -0.5) {
    return {
      id: 'trend',
      icon: '\u{1F4C9}',
      text: 'Your mood has been dipping recently',
      type: 'trend',
    };
  }

  return null;
}

export function detectPatterns(entries: MoodEntry[]): PatternFlag[] {
  if (entries.length < 7) return [];

  const dayPatterns = detectDayOfWeekPatterns(entries);
  const timePatterns = detectTimeOfDayPatterns(entries);
  const trend = detectTrendPattern(entries);

  const results = [...dayPatterns, ...timePatterns];
  if (trend) results.push(trend);
  return results;
}

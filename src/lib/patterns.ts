import type React from 'react';
import type { Ionicons } from '@expo/vector-icons';
import { MoodEntry, MoodSlot } from '@models/index';
import { MOOD_MAP, type MoodGroup } from '@constants/moods';
import { GROUP_SCORES } from '@lib/insights';
import { getMoodLabel } from '@lib/moodLabels';
import i18n from '@i18n/index';
import { getWeekdayLabels } from '@i18n/dateFormat';

export type PatternIconName = React.ComponentProps<typeof Ionicons>['name'];

export interface PatternFlag {
  id: string;
  icon: PatternIconName;
  text: string;
  type: 'day-of-week' | 'time-of-day' | 'trend';
}

const SLOT_KEYS: Record<MoodSlot, string> = {
  morning: 'morning',
  afternoon: 'afternoon',
  night: 'night',
  pre_sleep: 'pre_sleep',
};

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
        const weekdays = getWeekdayLabels('long');
        candidates.push({
          flag: {
            id: `dow-${moodId}-${day}`,
            icon: 'calendar-outline',
            text: i18n.t('screens:insights.patterns.dayOfWeek', {
              mood: getMoodLabel(moodId),
              day: weekdays[day],
            }),
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
            icon: 'time-outline',
            text: i18n.t('screens:insights.patterns.timeOfDay', {
              mood: getMoodLabel(moodId),
              slot: i18n.t(`dates:slot.${SLOT_KEYS[slot as MoodSlot]}`),
            }),
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
      icon: 'trending-up',
      text: i18n.t('screens:insights.patterns.trendUp'),
      type: 'trend',
    };
  }

  if (diff <= -0.5) {
    return {
      id: 'trend',
      icon: 'trending-down',
      text: i18n.t('screens:insights.patterns.trendDown'),
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

// ─── Resilience Score ─────────────────────────────────────────────────────────

export interface ResilienceResult {
  score: number;       // 0–100, higher = faster emotional recovery
  recoveries: number;  // number of recovery events found
  avgHours: number;    // average hours to recover from a difficult mood
}

const DIFFICULT_GROUPS: MoodGroup[] = ['red-orange', 'blue'];
const RECOVERY_GROUPS: MoodGroup[] = ['green', 'neutral'];

/**
 * Measures how quickly a user recovers from difficult moods (red-orange or blue)
 * back to positive/neutral ones. Returns null if insufficient data.
 *
 * Score 0–100: 100 = recover within ~1 hour, 0 = takes 48+ hours.
 */
export function calculateResilienceScore(entries: MoodEntry[]): ResilienceResult | null {
  if (entries.length < 2) return null;

  const sorted = [...entries].sort((a, b) => a.loggedAt.localeCompare(b.loggedAt));
  const recoveryHours: number[] = [];

  for (let i = 0; i < sorted.length; i++) {
    const mood = MOOD_MAP[sorted[i].moodId as keyof typeof MOOD_MAP];
    if (!mood || !DIFFICULT_GROUPS.includes(mood.group)) continue;

    for (let j = i + 1; j < sorted.length; j++) {
      const nextMood = MOOD_MAP[sorted[j].moodId as keyof typeof MOOD_MAP];
      if (!nextMood) continue;
      if (RECOVERY_GROUPS.includes(nextMood.group)) {
        const diffMs = new Date(sorted[j].loggedAt).getTime() - new Date(sorted[i].loggedAt).getTime();
        recoveryHours.push(diffMs / (1000 * 60 * 60));
        break;
      }
    }
  }

  if (recoveryHours.length === 0) return null;

  const avgHours = recoveryHours.reduce((s, h) => s + h, 0) / recoveryHours.length;
  const score = Math.max(0, Math.min(100, Math.round(100 - (avgHours / 48) * 100)));

  return { score, recoveries: recoveryHours.length, avgHours };
}

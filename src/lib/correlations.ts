import { MOOD_MAP } from '@constants/moods';
import { GROUP_SCORES } from '@lib/insights';
import type { Habit, HabitLog, MoodEntry } from '@models/index';

export type StrengthKey =
  | 'strongPositive'
  | 'strongNegative'
  | 'moderatePositive'
  | 'moderateNegative'
  | 'weakPositive'
  | 'weakNegative'
  | 'none';

export interface HabitCorrelation {
  habit: Habit;
  correlation: number;
  strength: StrengthKey;
  sampleSize: number;
}

export const MIN_LOGS_FOR_CORRELATION = 5;
export const MIN_BOOLEAN_DONE_DAYS = 3;

export function strengthKey(r: number): StrengthKey {
  const abs = Math.abs(r);
  const positive = r >= 0;
  if (abs >= 0.5) return positive ? 'strongPositive' : 'strongNegative';
  if (abs >= 0.3) return positive ? 'moderatePositive' : 'moderateNegative';
  if (abs >= 0.1) return positive ? 'weakPositive' : 'weakNegative';
  return 'none';
}

export function pearsonCorrelation(xs: number[], ys: number[]): number {
  const n = xs.length;
  if (n < 2) return 0;
  const meanX = xs.reduce((a, b) => a + b, 0) / n;
  const meanY = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let sdX = 0;
  let sdY = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - meanX) * (ys[i] - meanY);
    sdX += (xs[i] - meanX) ** 2;
    sdY += (ys[i] - meanY) ** 2;
  }
  const denom = Math.sqrt(sdX * sdY);
  return denom === 0 ? 0 : num / denom;
}

export function computeHabitCorrelations(
  habits: Habit[],
  logs: HabitLog[],
  entries: MoodEntry[],
): HabitCorrelation[] {
  const dailyMood: Record<string, number[]> = {};
  for (const e of entries) {
    const date = e.loggedAt.split('T')[0];
    const mood = MOOD_MAP[e.moodId as keyof typeof MOOD_MAP];
    const score = mood ? GROUP_SCORES[mood.group] : 3;
    if (!dailyMood[date]) dailyMood[date] = [];
    dailyMood[date].push(score);
  }
  const dailyAvg: Record<string, number> = {};
  for (const [date, scores] of Object.entries(dailyMood)) {
    dailyAvg[date] = scores.reduce((a, b) => a + b, 0) / scores.length;
  }

  const result: HabitCorrelation[] = [];

  for (const habit of habits) {
    const hLogs = logs.filter((l) => l.habitId === habit.id && dailyAvg[l.logDate] !== undefined);
    if (hLogs.length < MIN_LOGS_FOR_CORRELATION) continue;

    let r: number;
    if (habit.trackingType === 'scale') {
      r = pearsonCorrelation(
        hLogs.map((l) => l.value),
        hLogs.map((l) => dailyAvg[l.logDate]),
      );
    } else {
      const doneMean = hLogs.filter((l) => l.value === 1).map((l) => dailyAvg[l.logDate]);
      const skipMean = hLogs.filter((l) => l.value === 0).map((l) => dailyAvg[l.logDate]);
      if (doneMean.length < MIN_BOOLEAN_DONE_DAYS) continue;
      const avgDone = doneMean.reduce((a, b) => a + b, 0) / doneMean.length;
      const avgSkip =
        skipMean.length > 0
          ? skipMean.reduce((a, b) => a + b, 0) / skipMean.length
          : Object.values(dailyAvg).reduce((a, b) => a + b, 0) / Object.values(dailyAvg).length;
      r = (avgDone - avgSkip) / 3;
    }

    result.push({ habit, correlation: r, strength: strengthKey(r), sampleSize: hLogs.length });
  }

  return result.sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation));
}

export function correlationColor(r: number): string {
  const abs = Math.abs(r);
  if (abs >= 0.5) return r >= 0 ? '#66BB6A' : '#EF5350';
  if (abs >= 0.3) return r >= 0 ? '#AED581' : '#FF8A65';
  if (abs >= 0.1) return r >= 0 ? '#80DEEA' : '#FFD54F';
  return '#BDBDBD';
}

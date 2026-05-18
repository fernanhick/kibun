import type { MoodEntry, AchievementId, AchievementDefinition } from '@models/index';
import { MOODS } from '@constants/moods';

// ─── Achievement Definitions ──────────────────────────────────────────────────

export const ACHIEVEMENT_DEFINITIONS: AchievementDefinition[] = [
  {
    id: 'first_week',
    label: 'First Week',
    description: 'Logged moods every day for 7 days in a row.',
    emoji: '🗓️',
  },
  {
    id: 'month_warrior',
    label: 'Month Warrior',
    description: 'Kept a 30-day check-in streak.',
    emoji: '🏆',
  },
  {
    id: 'mood_explorer',
    label: 'Mood Explorer',
    description: 'Logged every available mood at least once.',
    emoji: '🌈',
  },
  {
    id: 'reflector',
    label: 'Reflector',
    description: 'Wrote 10 journal reflections.',
    emoji: '📔',
  },
  {
    id: 'early_bird',
    label: 'Early Bird',
    description: 'Logged morning check-ins 7 times.',
    emoji: '🌅',
  },
  {
    id: 'night_owl',
    label: 'Night Owl',
    description: 'Logged pre-sleep check-ins 7 times.',
    emoji: '🦉',
  },
  {
    id: 'consistent',
    label: 'Consistent',
    description: 'Logged 30 mood entries in total.',
    emoji: '⚡',
  },
];

// ─── Streak Calculation ───────────────────────────────────────────────────────

/** Returns the current consecutive-day streak from an array of entries. */
function getStreak(entries: MoodEntry[]): number {
  if (entries.length === 0) return 0;

  const uniqueDays = Array.from(
    new Set(entries.map((e) => e.loggedAt.split('T')[0]))
  ).sort().reverse(); // most recent first

  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86_400_000).toISOString().split('T')[0];

  // Streak must include today or yesterday to be "active"
  if (uniqueDays[0] !== today && uniqueDays[0] !== yesterday) return 0;

  let streak = 1;
  for (let i = 1; i < uniqueDays.length; i++) {
    const prev = new Date(uniqueDays[i - 1]);
    const curr = new Date(uniqueDays[i]);
    const diffDays = Math.round((prev.getTime() - curr.getTime()) / 86_400_000);
    if (diffDays === 1) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

// ─── Achievement Check ────────────────────────────────────────────────────────

/**
 * Returns newly unlocked achievement IDs (those not already present in unlockedIds).
 */
// Insight card illustration mapping (new custom PNGs)
export const INSIGHT_CARD_IMAGES: Record<string, any> = {
  // Existing keys kept for backward compatibility.
  sunrise: require('../../assets/badges/insight cards/welcome-back.png'),
  rainbow: require('../../assets/badges/insight cards/keep-it-going.png'),
  heart: require('../../assets/badges/insight cards/you-matter.png'),
  star: require('../../assets/badges/insight cards/you-showed-up.png'),
  cloud: require('../../assets/badges/insight cards/a-fresh-page.png'),
  sparkles: require('../../assets/badges/insight cards/glad-you-are-here.png'),
  // Native card-slug keys from the latest asset pack.
  'a-fresh-page': require('../../assets/badges/insight cards/a-fresh-page.png'),
  'glad-you-are-here': require('../../assets/badges/insight cards/glad-you-are-here.png'),
  'keep-it-going': require('../../assets/badges/insight cards/keep-it-going.png'),
  'one-breadth': require('../../assets/badges/insight cards/one-breadth.png'),
  'we-are-here-with-you': require('../../assets/badges/insight cards/we-are-here-with-you.png'),
  'welcome-back': require('../../assets/badges/insight cards/welcome-back.png'),
  'you-matter': require('../../assets/badges/insight cards/you-matter.png'),
  'you-showed-up': require('../../assets/badges/insight cards/you-showed-up.png'),
};
export function checkAchievements(
  entries: MoodEntry[],
  unlockedIds: string[]
): AchievementId[] {
  const newlyUnlocked: AchievementId[] = [];
  const alreadyUnlocked = new Set(unlockedIds);

  const streak = getStreak(entries);
  const uniqueMoods = new Set(entries.map((e) => e.moodId)).size;
  const journalCount = entries.filter((e) => e.journalResponse).length;
  const morningCount = entries.filter((e) => e.slot === 'morning').length;
  const preSleepCount = entries.filter((e) => e.slot === 'pre_sleep').length;
  const totalEntries = entries.length;

  const conditions: { id: AchievementId; met: boolean }[] = [
    { id: 'first_week',    met: streak >= 7 },
    { id: 'month_warrior', met: streak >= 30 },
    { id: 'mood_explorer', met: uniqueMoods >= MOODS.length },
    { id: 'reflector',     met: journalCount >= 10 },
    { id: 'early_bird',    met: morningCount >= 7 },
    { id: 'night_owl',     met: preSleepCount >= 7 },
    { id: 'consistent',    met: totalEntries >= 30 },
  ];

  for (const { id, met } of conditions) {
    if (met && !alreadyUnlocked.has(id)) {
      newlyUnlocked.push(id);
    }
  }

  return newlyUnlocked;
}

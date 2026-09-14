import type { MoodEntry, AchievementId } from '@models/index';
import { MOODS } from '@constants/moods';

// ─── Achievement Definitions ──────────────────────────────────────────────────

// Display order for the badge grid, and the source of truth for which
// achievements exist. Labels and descriptions live in i18n under
// `screens:achievements.<id>` — they used to be hardcoded English here and were
// rendered untranslated to all four locales. The unlock criteria are not
// restated in prose either; `checkAchievements` below is the only statement.
export const ACHIEVEMENT_IDS: AchievementId[] = [
  'first_week',
  'month_warrior',
  'mood_explorer',
  'reflector',
  'early_bird',
  'night_owl',
  'consistent',
];

// Achievement badge image mapping (AchievementId → bundled PNG).
export const ACHIEVEMENT_BADGE_IMAGES: Record<AchievementId, any> = {
  first_week:    require('../../assets/badges/achievement badges/7-day-streak.png'),
  month_warrior: require('../../assets/badges/achievement badges/month-warrior.png'),
  mood_explorer: require('../../assets/badges/achievement badges/mood-explorer.png'),
  reflector:     require('../../assets/badges/achievement badges/reflector.png'),
  early_bird:    require('../../assets/badges/achievement badges/early-bird.png'),
  night_owl:     require('../../assets/badges/achievement badges/night-owl.png'),
  consistent:    require('../../assets/badges/achievement badges/consistent.png'),
};

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
// Insight card illustration mapping (slug → bundled PNG).
// Slugs are stored in i18n JSON under `imageKey` and resolved at render time.
export const INSIGHT_CARD_IMAGES: Record<string, any> = {
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

// ─── Unlock events ────────────────────────────────────────────────────────────
// Lets the root-mounted celebration react to an unlock without the stores
// reaching into the view tree. Emitted once per saved entry with every id that
// landed on it, so a check-in that unlocks two does not fire twice.
type UnlockListener = (ids: AchievementId[]) => void;
const unlockListeners = new Set<UnlockListener>();

export const achievementEvents = {
  subscribe(listener: UnlockListener): () => void {
    unlockListeners.add(listener);
    return () => unlockListeners.delete(listener);
  },
  emit(ids: AchievementId[]): void {
    if (ids.length === 0) return;
    for (const l of unlockListeners) l(ids);
  },
};

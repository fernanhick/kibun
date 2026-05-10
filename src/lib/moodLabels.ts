import { MOOD_MAP, type MoodId } from '@constants/moods';
import type { CustomMood } from '@models/index';
import i18n from '@i18n/index';

// Returns the user-facing label for any mood id. Built-in moods resolve through
// i18n; custom moods (user-typed) are returned verbatim. Falls back to the raw
// id if the mood is unknown — protects screens from rendering "undefined".
export function getMoodLabel(moodId: string, customMoods: CustomMood[] = []): string {
  if (moodId in MOOD_MAP) {
    return i18n.t(`moods:${moodId as MoodId}.label`);
  }
  const custom = customMoods.find((m) => m.id === moodId);
  return custom?.label ?? moodId;
}

export function getMoodGroupLabel(group: string): string {
  return i18n.t(`moods:groups.${group}`);
}

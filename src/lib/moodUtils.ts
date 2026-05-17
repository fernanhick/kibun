import { MOOD_MAP, type MoodDefinition, type MoodId } from '@constants/moods';
import type { CustomMood } from '@models/index';
import i18n from '@i18n/index';

const TEXT = '#1A1A2E';
const LEGACY_MOOD_ALIASES: Record<string, MoodId> = {
  meh: 'bored',
  anxious: 'worried',
};

export function getMoodDef(
  moodId: string,
  customMoods: CustomMood[],
): MoodDefinition | null {
  const normalizedMoodId = LEGACY_MOOD_ALIASES[moodId] ?? moodId;

  if (normalizedMoodId in MOOD_MAP) {
    const key = normalizedMoodId as MoodId;
    const def = MOOD_MAP[key];
    return { ...def, label: i18n.t(`moods:${key}.label`) };
  }
  const custom = customMoods.find((m) => m.id === moodId);
  if (!custom) return null;
  return {
    id: custom.id as MoodId,
    label: custom.label,
    group: custom.group,
    bubbleColor: custom.color,
    textColor: TEXT,
    tintColor: custom.color + '33',
  };
}

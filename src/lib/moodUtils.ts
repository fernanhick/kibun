import { MOOD_MAP, type MoodDefinition, type MoodId } from '@constants/moods';
import type { CustomMood } from '@models/index';

const TEXT = '#1A1A2E';

export function getMoodDef(
  moodId: string,
  customMoods: CustomMood[],
): MoodDefinition | null {
  if (moodId in MOOD_MAP) return MOOD_MAP[moodId as MoodId];
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

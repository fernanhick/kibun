import type { HabitTrackingType } from '@models/index';

export interface HabitPreset {
  key: string;
  name: string;
  icon: string;
  trackingType: HabitTrackingType;
}

export const PRESET_HABITS: HabitPreset[] = [
  { key: 'sleepQuality', name: 'Sleep quality', icon: '😴', trackingType: 'scale' },
  { key: 'exercise', name: 'Exercise', icon: '🏃', trackingType: 'boolean' },
  { key: 'meditated', name: 'Meditated', icon: '🧘', trackingType: 'boolean' },
  { key: 'socialised', name: 'Socialised', icon: '👫', trackingType: 'boolean' },
  { key: 'alcohol', name: 'Alcohol', icon: '🍺', trackingType: 'boolean' },
];

export function findPreset(name: string): HabitPreset | undefined {
  const lower = name.toLowerCase();
  return PRESET_HABITS.find((p) => p.name.toLowerCase() === lower);
}

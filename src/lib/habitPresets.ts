import type { HabitTrackingType } from '@models/index';

export interface HabitPreset {
  key: string;
  name: string;
  icon: string;
  trackingType: HabitTrackingType;
}

export const PRESET_HABITS: HabitPreset[] = [
  { key: 'sleepQuality', name: 'Sleep quality', icon: 'ion:bed-outline',     trackingType: 'scale' },
  { key: 'exercise',     name: 'Exercise',      icon: 'ion:walk-outline',    trackingType: 'boolean' },
  { key: 'meditated',    name: 'Meditated',     icon: 'ion:leaf-outline',    trackingType: 'boolean' },
  { key: 'socialised',   name: 'Socialised',    icon: 'ion:people-outline',  trackingType: 'boolean' },
  { key: 'alcohol',      name: 'Alcohol',       icon: 'ion:wine-outline',    trackingType: 'boolean' },
];

export function findPreset(name: string): HabitPreset | undefined {
  const lower = name.toLowerCase();
  return PRESET_HABITS.find((p) => p.name.toLowerCase() === lower);
}

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

// Curated Ionicons for the custom-habit picker. Using vector glyphs (instead of
// free-typed emoji) keeps every habit icon consistent with the presets and the
// rest of the UI. Stored with the `ion:` prefix that HabitIcon understands.
export const HABIT_ICONS: string[] = [
  'ion:water-outline',
  'ion:restaurant-outline',
  'ion:bed-outline',
  'ion:walk-outline',
  'ion:barbell-outline',
  'ion:bicycle-outline',
  'ion:fitness-outline',
  'ion:leaf-outline',
  'ion:book-outline',
  'ion:school-outline',
  'ion:briefcase-outline',
  'ion:musical-notes-outline',
  'ion:brush-outline',
  'ion:people-outline',
  'ion:heart-outline',
  'ion:happy-outline',
  'ion:sunny-outline',
  'ion:moon-outline',
  'ion:cafe-outline',
  'ion:wine-outline',
  'ion:medkit-outline',
  'ion:journal-outline',
  'ion:flower-outline',
  'ion:paw-outline',
  'ion:cash-outline',
  'ion:phone-portrait-outline',
  'ion:sparkles-outline',
  'ion:checkmark-circle-outline',
];

// Default icon for a custom habit when the user doesn't pick one.
export const DEFAULT_HABIT_ICON = HABIT_ICONS[0];

// Pre-vector-glyph versions of the app stored raw emoji in each habit's `icon`
// field (presets + the `✓` custom default). Map those legacy values onto the
// current `ion:` glyphs so habits selected in an older build don't keep showing
// the old emoji. Custom emoji the user typed themselves aren't in this table and
// are left untouched. See migrateHabitIcon().
const LEGACY_ICON_MAP: Record<string, string> = {
  '😴': 'ion:bed-outline',     // Sleep quality
  '🏃': 'ion:walk-outline',    // Exercise
  '🧘': 'ion:leaf-outline',    // Meditated
  '👫': 'ion:people-outline',  // Socialised
  '🍺': 'ion:wine-outline',    // Alcohol
  '✓': 'ion:checkmark-circle-outline', // old custom-habit default
};

// Upgrades a stored habit icon to the current vector glyph when it matches a
// known legacy emoji; otherwise returns it unchanged. Safe to call repeatedly.
export function migrateHabitIcon(icon: string): string {
  return LEGACY_ICON_MAP[icon] ?? icon;
}

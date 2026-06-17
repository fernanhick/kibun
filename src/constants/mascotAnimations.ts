import type { MoodId } from './moods';

export type MascotVariant = 'happy' | 'calm' | 'tired' | 'sad' | 'angry';

const MASCOT_SOURCES = {
  happy: require('../../assets/webp animation/mascot-happy.webp'),
  calm:  require('../../assets/webp animation/mascot-calm.webp'),
  tired: require('../../assets/webp animation/mascot-tired.webp'),
  sad:   require('../../assets/webp animation/mascot-sad.webp'),
  angry: require('../../assets/webp animation/mascot-angry.webp'),
} as const;

/** Cycle order for tapping the tab-bar mascot. */
export const MASCOT_VARIANTS: MascotVariant[] = ['happy', 'calm', 'tired', 'sad', 'angry'];

const MOOD_TO_MASCOT: Record<MoodId, MascotVariant> = {
  happy:      'happy',
  excited:    'happy',
  grateful:   'happy',
  bright:     'happy',
  cheeky:     'happy',
  loved:      'happy',
  surprised:  'happy',
  calm:       'calm',
  tired:      'tired',
  bored:      'tired',
  confused:   'tired',
  sad:        'sad',
  melancholy: 'sad',
  lonely:     'sad',
  worried:    'angry',
  scared:     'angry',
  frustrated: 'angry',
  angry:      'angry',
};

/** Resolve a MoodId or MascotVariant to its mascot variant. Defaults to 'happy'. */
export function getMascotVariant(key?: string): MascotVariant {
  if (!key) return 'happy';
  if (key in MASCOT_SOURCES) return key as MascotVariant;
  return MOOD_TO_MASCOT[key as MoodId] ?? 'happy';
}

/** Accept a MoodId or a MascotVariant directly. Defaults to 'happy'. */
export function getMascotSource(key?: string) {
  return MASCOT_SOURCES[getMascotVariant(key)];
}

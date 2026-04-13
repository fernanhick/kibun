import type { MoodId } from './moods';

export type MascotVariant = 'happy' | 'calm' | 'tired' | 'sad' | 'angry';

const MASCOT_SOURCES = {
  happy: require('../../assets/webp animation/mascot-happy.webp'),
  calm:  require('../../assets/webp animation/mascot-calm.webp'),
  tired: require('../../assets/webp animation/mascot-tired.webp'),
  sad:   require('../../assets/webp animation/mascot-sad.webp'),
  angry: require('../../assets/webp animation/mascot-angry.webp'),
} as const;

const MOOD_TO_MASCOT: Record<MoodId, MascotVariant> = {
  happy:      'happy',
  excited:    'happy',
  grateful:   'happy',
  calm:       'calm',
  meh:        'tired',
  tired:      'tired',
  bored:      'tired',
  confused:   'tired',
  sad:        'sad',
  melancholy: 'sad',
  lonely:     'sad',
  anxious:    'angry',
  frustrated: 'angry',
  angry:      'angry',
};

/** Accept a MoodId or a MascotVariant directly. Defaults to 'happy'. */
export function getMascotSource(key?: string) {
  if (!key) return MASCOT_SOURCES.happy;
  if (key in MASCOT_SOURCES) return MASCOT_SOURCES[key as MascotVariant];
  return MASCOT_SOURCES[MOOD_TO_MASCOT[key as MoodId] ?? 'happy'];
}

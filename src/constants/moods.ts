// ─── Mood Type Definitions ────────────────────────────────────────────────────
// Mood IDs are used across storage, reports, and UI rendering.

export type MoodId =
  | 'happy' | 'excited' | 'grateful' | 'calm' | 'bright' | 'cheeky' | 'loved' | 'surprised'
  | 'tired' | 'bored' | 'confused'
  | 'sad' | 'worried' | 'frustrated' | 'angry' | 'scared'
  | 'melancholy' | 'lonely';

export type MoodGroup = 'green' | 'neutral' | 'red-orange' | 'blue';

export interface MoodDefinition {
  id: MoodId;
  label: string;
  group: MoodGroup;
  bubbleColor: string;  // Circle background color
  textColor: string;    // Mood label — WCAG 2.1 AA verified (≥4.5:1) against bubbleColor
  tintColor: string;    // Light tint for calendar day cells & backgrounds (light theme)
  tintColorDark: string;// Deep mood-tinted tint for the same surfaces in dark theme
  imageKey?: string;    // Custom moods only — key into MOOD_IMAGES e.g. 'happy'
}

// All moods use this text color. #1A1A2E on any bubble below achieves ≥4.5:1 contrast.
// Verified: riskiest pair is Angry (#EF5350) at 4.67:1. Lightest is Confused (#FFD54F) at 12.1:1.
const TEXT = '#1A1A2E';

// ─── Mood Definitions ─────────────────────────────────────────────────────────
export const MOODS: MoodDefinition[] = [
  // ─── Green (positive) ────────────────────────────────────────────────────
  { id: 'happy',     label: 'Happy',     group: 'green',     bubbleColor: '#66BB6A', textColor: TEXT, tintColor: '#E8F5E9', tintColorDark: '#2B5E3C' },
  { id: 'excited',   label: 'Excited',   group: 'green',     bubbleColor: '#B7CE63', textColor: TEXT, tintColor: '#F4F7E6', tintColorDark: '#44521F' },
  { id: 'grateful',  label: 'Grateful',  group: 'green',     bubbleColor: '#81C784', textColor: TEXT, tintColor: '#E8F5E9', tintColorDark: '#2C5E40' },
  { id: 'bright',    label: 'Bright',    group: 'green',     bubbleColor: '#A5D6A7', textColor: TEXT, tintColor: '#E8F5E9', tintColorDark: '#2F6344' },
  { id: 'cheeky',    label: 'Cheeky',    group: 'green',     bubbleColor: '#AED581', textColor: TEXT, tintColor: '#F1F8E9', tintColorDark: '#41521D' },
  { id: 'loved',     label: 'Loved',     group: 'green',     bubbleColor: '#9CCC65', textColor: TEXT, tintColor: '#F1F8E9', tintColorDark: '#3D5320' },
  { id: 'surprised', label: 'Surprised', group: 'green',     bubbleColor: '#C9D38A', textColor: TEXT, tintColor: '#F5F7E8', tintColorDark: '#47521F' },
  { id: 'calm',      label: 'Calm',      group: 'green',     bubbleColor: '#80DEEA', textColor: TEXT, tintColor: '#E0F7FA', tintColorDark: '#1C545A' },
  // ─── Neutral (mixed) ─────────────────────────────────────────────────────
  { id: 'tired',     label: 'Tired',     group: 'neutral',   bubbleColor: '#BCAAA4', textColor: TEXT, tintColor: '#EFEBE9', tintColorDark: '#54453B' },
  { id: 'bored',     label: 'Bored',     group: 'neutral',   bubbleColor: '#B0BEC5', textColor: TEXT, tintColor: '#ECEFF1', tintColorDark: '#38454F' },
  { id: 'confused',  label: 'Confused',  group: 'neutral',   bubbleColor: '#EFC85A', textColor: TEXT, tintColor: '#FBF3DC', tintColorDark: '#54461C' },
  // ─── Red / Orange (negative energy) ──────────────────────────────────────
  { id: 'sad',        label: 'Sad',        group: 'red-orange', bubbleColor: '#F48FB1', textColor: TEXT, tintColor: '#FCE4EC', tintColorDark: '#592C42' },
  { id: 'worried',    label: 'Worried',    group: 'red-orange', bubbleColor: '#FFB74D', textColor: TEXT, tintColor: '#FFF3E0', tintColorDark: '#573E16' },
  { id: 'scared',     label: 'Scared',     group: 'red-orange', bubbleColor: '#FFCC80', textColor: TEXT, tintColor: '#FFF8E1', tintColorDark: '#56431E' },
  { id: 'frustrated', label: 'Frustrated', group: 'red-orange', bubbleColor: '#FF8A65', textColor: TEXT, tintColor: '#FBE9E7', tintColorDark: '#58341F' },
  { id: 'angry',      label: 'Angry',      group: 'red-orange', bubbleColor: '#EF5350', textColor: TEXT, tintColor: '#FFEBEE', tintColorDark: '#5A2522' },
  // ─── Blue (introspective) ─────────────────────────────────────────────────
  { id: 'melancholy', label: 'Melancholy', group: 'blue', bubbleColor: '#90CAF9', textColor: TEXT, tintColor: '#E3F2FD', tintColorDark: '#234461' },
  { id: 'lonely',     label: 'Lonely',     group: 'blue', bubbleColor: '#B39DDB', textColor: TEXT, tintColor: '#EDE7F6', tintColorDark: '#3F2F5A' },
];

// ─── Primary Moods ────────────────────────────────────────────────────────────
// The everyday subset shown first in the quick-logger; the full list sits behind
// a "See more" expander. Chosen to span the spectrum (high-positive → intense)
// so most check-ins need only this row.
export const PRIMARY_MOOD_IDS: MoodId[] = [
  'happy', 'calm', 'tired', 'sad', 'worried', 'angry',
];

export const PRIMARY_MOODS: MoodDefinition[] = PRIMARY_MOOD_IDS.map(
  (id) => MOODS.find((m) => m.id === id)!,
);

// ─── O(1) Mood Lookup ─────────────────────────────────────────────────────────
// Pre-built for render loops in calendar (Phase 5) and trend charts (Phase 7).
export const MOOD_MAP = Object.fromEntries(
  MOODS.map((m) => [m.id, m])
) as Record<MoodId, MoodDefinition>;

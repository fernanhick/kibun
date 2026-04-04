// ─── Mood Type Definitions ────────────────────────────────────────────────────
// 14-mood V1 set defined in PLANNING.md. Do not add or remove IDs here —
// mood IDs are a shared contract used by sessionStore, Supabase schema, and AI reports.

export type MoodId =
  | 'happy' | 'excited' | 'grateful' | 'calm'
  | 'meh' | 'tired' | 'bored' | 'confused'
  | 'sad' | 'anxious' | 'frustrated' | 'angry'
  | 'melancholy' | 'lonely';

export type MoodGroup = 'green' | 'neutral' | 'red-orange' | 'blue';

export interface MoodDefinition {
  id: MoodId;
  label: string;
  group: MoodGroup;
  bubbleColor: string;  // Circle background color
  textColor: string;    // Mood label — WCAG 2.1 AA verified (≥4.5:1) against bubbleColor
  tintColor: string;    // Very light tint for calendar day cells and backgrounds
}

// All moods use this text color. #1A1A2E on any bubble below achieves ≥4.5:1 contrast.
// Verified: riskiest pair is Angry (#EF5350) at 4.67:1. Lightest is Confused (#FFD54F) at 12.1:1.
const TEXT = '#1A1A2E';

// ─── Mood Definitions ─────────────────────────────────────────────────────────
export const MOODS: MoodDefinition[] = [
  // ─── Green (positive) ────────────────────────────────────────────────────
  { id: 'happy',     label: 'Happy',     group: 'green',     bubbleColor: '#66BB6A', textColor: TEXT, tintColor: '#E8F5E9' },
  { id: 'excited',   label: 'Excited',   group: 'green',     bubbleColor: '#C6E82B', textColor: TEXT, tintColor: '#F9FBE7' },
  { id: 'grateful',  label: 'Grateful',  group: 'green',     bubbleColor: '#81C784', textColor: TEXT, tintColor: '#E8F5E9' },
  { id: 'calm',      label: 'Calm',      group: 'green',     bubbleColor: '#80DEEA', textColor: TEXT, tintColor: '#E0F7FA' },
  // ─── Neutral (mixed) ─────────────────────────────────────────────────────
  { id: 'meh',       label: 'Meh',       group: 'neutral',   bubbleColor: '#BDBDBD', textColor: TEXT, tintColor: '#FAFAFA' },
  { id: 'tired',     label: 'Tired',     group: 'neutral',   bubbleColor: '#BCAAA4', textColor: TEXT, tintColor: '#EFEBE9' },
  { id: 'bored',     label: 'Bored',     group: 'neutral',   bubbleColor: '#B0BEC5', textColor: TEXT, tintColor: '#ECEFF1' },
  { id: 'confused',  label: 'Confused',  group: 'neutral',   bubbleColor: '#FFD54F', textColor: TEXT, tintColor: '#FFFDE7' },
  // ─── Red / Orange (negative energy) ──────────────────────────────────────
  { id: 'sad',        label: 'Sad',        group: 'red-orange', bubbleColor: '#F48FB1', textColor: TEXT, tintColor: '#FCE4EC' },
  { id: 'anxious',    label: 'Anxious',    group: 'red-orange', bubbleColor: '#FFAB40', textColor: TEXT, tintColor: '#FFF3E0' },
  { id: 'frustrated', label: 'Frustrated', group: 'red-orange', bubbleColor: '#FF8A65', textColor: TEXT, tintColor: '#FBE9E7' },
  { id: 'angry',      label: 'Angry',      group: 'red-orange', bubbleColor: '#EF5350', textColor: TEXT, tintColor: '#FFEBEE' },
  // ─── Blue (introspective) ─────────────────────────────────────────────────
  { id: 'melancholy', label: 'Melancholy', group: 'blue', bubbleColor: '#90CAF9', textColor: TEXT, tintColor: '#E3F2FD' },
  { id: 'lonely',     label: 'Lonely',     group: 'blue', bubbleColor: '#B39DDB', textColor: TEXT, tintColor: '#EDE7F6' },
];

// ─── O(1) Mood Lookup ─────────────────────────────────────────────────────────
// Pre-built for render loops in calendar (Phase 5) and trend charts (Phase 7).
export const MOOD_MAP = Object.fromEntries(
  MOODS.map((m) => [m.id, m])
) as Record<MoodId, MoodDefinition>;

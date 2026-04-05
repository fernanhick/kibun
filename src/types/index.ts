// Foundational types used across all phases of kibun

export type MoodSlot = 'morning' | 'afternoon' | 'night' | 'pre_sleep';

// Notification slots are user-facing (from onboarding picker), separate from MoodSlot.
// Different naming: 'evening' vs 'night', 'pre-sleep' vs 'pre_sleep'.
export type NotificationSlot = 'morning' | 'afternoon' | 'evening' | 'pre-sleep';

export type AuthStatus = 'anonymous' | 'registered';

export type SubscriptionStatus = 'trial' | 'active' | 'expired' | 'none';

export interface UserSession {
  userId: string;
  authStatus: AuthStatus;
  subscriptionStatus: SubscriptionStatus;
}

// ─── Onboarding ──────────────────────────────────────────────────────────────

export interface OnboardingProfile {
  // Personal
  name: string;
  ageRange: string | null;
  gender: string | null;
  // Work
  employment: string | null;
  workSetting: string | null;
  workHours: string | null;
  // Physical
  sleepHours: string | null;
  exercise: string | null;
  // Social / Mental / Goals — filled in 02-03
  socialFrequency: string | null;
  stressLevel: string | null;
  goals: string[];
}

export interface PickerOption {
  label: string;
  value: string;
}

// ─── Mood Entries ───────────────────────────────────────────────────────────

export type { MoodId } from '@constants/moods';

export interface MoodEntry {
  id: string;           // client-generated, for local AsyncStorage indexing
  moodId: string;       // MoodId value — stored as string for serialization
  note: string | null;  // optional user note
  slot: MoodSlot;       // auto-detected from time of day
  loggedAt: string;     // ISO 8601 timestamp
}

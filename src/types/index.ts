// Foundational types used across all phases of kibun

export type MoodSlot = 'morning' | 'afternoon' | 'night' | 'pre_sleep';

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

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

export type SentimentLabel = 'positive' | 'neutral' | 'negative';

export interface MoodEntry {
  id: string;                          // client-generated, for local AsyncStorage indexing
  moodId: string;                      // MoodId value — stored as string for serialization
  note: string | null;                 // optional user note
  slot: MoodSlot;                      // auto-detected from time of day
  loggedAt: string;                    // ISO 8601 timestamp
  sentimentLabel?: SentimentLabel;     // ONNX-inferred note sentiment (undefined when no note)
  sentimentScore?: number;             // confidence 0–1 for the sentiment label
  // Pro: AI Journaling
  journalPrompt?: string;              // AI-generated reflection question (Pro only)
  journalResponse?: string;            // user's typed response
  // Pro: Multi-dimensional check-ins
  energyLevel?: number;                // 1–5 scale (Pro only)
  focusLevel?: number;                 // 1–5 scale (Pro only)
}

// ─── Habits ───────────────────────────────────────────────────────────────────

export type HabitTrackingType = 'boolean' | 'scale';

export interface Habit {
  id: string;
  name: string;
  icon: string;
  trackingType: HabitTrackingType;
  displayOrder: number;
  createdAt: string;
}

export interface HabitLog {
  id: string;
  habitId: string;
  logDate: string;   // YYYY-MM-DD
  value: number;     // 1 for boolean done; 1–5 for scale
}

// ─── Life Events ──────────────────────────────────────────────────────────────

export type LifeEventCategory =
  | 'work'
  | 'social'
  | 'health'
  | 'travel'
  | 'relationship'
  | 'personal';

export interface LifeEvent {
  id: string;
  title: string;
  category: LifeEventCategory;
  eventDate: string;   // YYYY-MM-DD
  notes?: string;
  createdAt: string;   // ISO timestamp
}

// ─── Achievements ─────────────────────────────────────────────────────────────

export type AchievementId =
  | 'first_week'
  | 'month_warrior'
  | 'mood_explorer'
  | 'reflector'
  | 'early_bird'
  | 'night_owl'
  | 'consistent';

export interface AchievementDefinition {
  id: AchievementId;
  label: string;
  description: string;
  emoji: string;
}

// ─── Custom Moods ─────────────────────────────────────────────────────────────

export interface CustomMood {
  id: string;          // 'custom_xxxxxx' client-generated
  label: string;       // max 12 chars
  color: string;       // hex color e.g. '#FF6B9D'
  group: 'green' | 'neutral' | 'red-orange' | 'blue';  // matches MoodGroup
  createdAt: string;   // ISO timestamp
}

// ─── AI Reports ───────────────────────────────────────────────────────────────

export type AIReportTone = 'positive' | 'neutral' | 'mixed' | 'tough';

export interface AIReportStructured {
  schemaVersion: number;
  headline: string | null;
  summary: string;
  patterns: string[];
  highlight: { label: string; detail: string } | null;
  nudge: { title: string; body: string };
  tone: AIReportTone;
}

export interface AIReport {
  id: string;
  userId: string;
  reportType: 'weekly' | 'monthly' | 'annual' | 'daily';
  periodStart: string;     // ISO date (YYYY-MM-DD)
  periodEnd: string;       // ISO date (YYYY-MM-DD)
  content: string;         // markdown / plain-text narrative (always present)
  structured: AIReportStructured | null; // rich payload for new reports; null for legacy
  moodSummary: {
    totalEntries: number;
    topMoods: { moodId: string; count: number }[];
    avgEntriesPerDay: number;
  } | null;
  createdAt: string;       // ISO timestamp
}

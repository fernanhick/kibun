// No persist middleware — profile is in-memory until written to Supabase at onboarding
// completion in Plan 02-03. In-memory avoids stale data on reinstall.
import { create } from 'zustand';
import { OnboardingProfile } from '@models/index';
import type { MoodId } from '@constants/moods';

const INITIAL_PROFILE: OnboardingProfile = {
  name: '',
  ageRange: null,
  gender: null,
  employment: null,
  workSetting: null,
  workHours: null,
  sleepHours: null,
  exercise: null,
  socialFrequency: null,
  stressLevel: null,
  goals: [],
};

interface OnboardingState {
  profile: OnboardingProfile;
  firstMoodId: MoodId | null;
  updateProfile: (patch: Partial<OnboardingProfile>) => void;
  setFirstMoodId: (moodId: MoodId | null) => void;
  resetProfile: () => void;
}

export const useOnboardingStore = create<OnboardingState>()((set) => ({
  profile: INITIAL_PROFILE,
  firstMoodId: null,
  updateProfile: (patch) =>
    set((state) => ({ profile: { ...state.profile, ...patch } })),
  setFirstMoodId: (moodId) => set({ firstMoodId: moodId }),
  resetProfile: () => set({ profile: INITIAL_PROFILE, firstMoodId: null }),
}));

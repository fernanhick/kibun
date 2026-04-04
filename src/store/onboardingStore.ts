// No persist middleware — profile is in-memory until written to Supabase at onboarding
// completion in Plan 02-03. In-memory avoids stale data on reinstall.
import { create } from 'zustand';
import { OnboardingProfile } from '@models/index';

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
  updateProfile: (patch: Partial<OnboardingProfile>) => void;
  resetProfile: () => void;
}

export const useOnboardingStore = create<OnboardingState>()((set) => ({
  profile: INITIAL_PROFILE,
  updateProfile: (patch) =>
    set((state) => ({ profile: { ...state.profile, ...patch } })),
  resetProfile: () => set({ profile: INITIAL_PROFILE }),
}));

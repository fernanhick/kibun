import { supabase } from './supabase';
import type { OnboardingProfile } from '@models/index';

/**
 * Fire-and-forget upsert of the onboarding profile to Supabase.
 * Safe to call for anonymous users — their user_id is preserved on account upgrade.
 */
export function saveProfileToSupabase(
  userId: string,
  profile: OnboardingProfile
): void {
  if (!supabase || !userId) return;

  supabase
    .from('profiles')
    .upsert(
      {
        user_id: userId,
        name: profile.name || null,
        age_range: profile.ageRange,
        gender: profile.gender,
        employment: profile.employment,
        work_setting: profile.workSetting,
        work_hours: profile.workHours,
        sleep_hours: profile.sleepHours,
        exercise: profile.exercise,
        social_frequency: profile.socialFrequency,
        stress_level: profile.stressLevel,
        goals: profile.goals.length > 0 ? profile.goals : null,
      },
      { onConflict: 'user_id' }
    )
    .then(({ error }) => {
      if (error && __DEV__) {
        console.error('[kibun:profile] Supabase upsert failed:', error.message);
      }
    });
}

import { supabase, withFreshAuth } from './supabase';
import type { OnboardingProfile, SubscriptionStatus } from '@models/index';

/**
 * Fire-and-forget upsert of the onboarding profile to Supabase.
 * Safe to call for anonymous users — their user_id is preserved on account upgrade.
 */
export function saveProfileToSupabase(
  userId: string,
  profile: OnboardingProfile
): void {
  if (!supabase || !userId) return;

  const basePayload: Record<string, unknown> = {
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
    coping_strategies:
      profile.copingStrategies.length > 0 ? profile.copingStrategies : null,
    goals: profile.goals.length > 0 ? profile.goals : null,
  };

  const upsert = (payload: Record<string, unknown>) =>
    withFreshAuth(() =>
      supabase!.from('profiles').upsert(payload, { onConflict: 'user_id' })
    );

  void upsert(basePayload).then(({ error }) => {
    if (!error) return;

    // If a column the app knows about hasn't been migrated yet, PostgREST
    // returns "Could not find the 'X' column ... in the schema cache".
    // Strip the offending key and retry once so the rest of the profile
    // still persists instead of dropping the whole upsert.
    const missingColumn = parseMissingColumn(error.message);
    if (missingColumn && missingColumn in basePayload) {
      const { [missingColumn]: _omit, ...retryPayload } = basePayload;
      if (__DEV__) {
        console.warn(
          `[kibun:profile] '${missingColumn}' column missing in Supabase; retrying without it. Run the pending migration.`
        );
      }
      void upsert(retryPayload).then(({ error: retryError }) => {
        if (retryError && __DEV__) {
          console.error('[kibun:profile] Supabase upsert failed:', retryError.message);
        }
      });
      return;
    }

    if (__DEV__) {
      console.error('[kibun:profile] Supabase upsert failed:', error.message);
    }
  });
}

function parseMissingColumn(message: string): string | null {
  const match = message.match(/Could not find the '([^']+)' column/i);
  return match ? match[1] : null;
}

/**
 * Writes the subscription status to the profiles table in Supabase so that
 * server-side Edge Functions can verify entitlement without calling RevenueCat.
 * Fire-and-forget — call after a successful RevenueCat purchase confirmation.
 */
export function syncSubscriptionStatusToSupabase(
  userId: string,
  status: SubscriptionStatus,
): void {
  if (!supabase || !userId) return;

  void withFreshAuth(() =>
    supabase!
      .from('profiles')
      .upsert(
        { user_id: userId, subscription_status: status },
        { onConflict: 'user_id' },
      )
  ).then(({ error }) => {
    if (error && __DEV__) {
      console.error('[kibun:profile] Failed to sync subscription_status:', error.message);
    }
  });
}

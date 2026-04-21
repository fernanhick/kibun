import { supabase } from '@lib/supabase';
import type { OnboardingProfile } from '@models/index';

export async function fetchDailyInsight(params: {
  profile?: Partial<OnboardingProfile>;
}): Promise<string | null> {
  if (!supabase) return null;

  const { data, error } = await supabase.functions.invoke('generate-daily-insight', {
    body: { profile: params.profile },
  });

  if (error) {
    if (__DEV__) {
      console.error('[kibun:dailyInsight] fetch failed:', error.message);
    }
    return null;
  }

  return data?.insight ?? null;
}

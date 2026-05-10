import { supabase } from '@lib/supabase';
import type { OnboardingProfile } from '@models/index';
import i18n from '@i18n/index';

export async function fetchDailyInsight(params: {
  profile?: Partial<OnboardingProfile>;
}): Promise<string | null> {
  if (!supabase) return null;

  const { data, error } = await supabase.functions.invoke('generate-daily-insight', {
    body: { profile: params.profile, language: i18n.language },
  });

  if (error) {
    // Edge Function returns non-2xx for known states (subscription_required,
    // unauthorized, ai_unavailable). Those are anticipated for users without a
    // confirmed server-side subscription_status (e.g. webhook not yet fired),
    // not bugs — surface them silently. Only log truly unexpected failures.
    let knownReason: string | null = null;
    try {
      const body = await (error as { context?: Response }).context?.json?.();
      if (body?.error) knownReason = body.error;
    } catch {
      // ignore
    }
    if (__DEV__ && !knownReason) {
      console.warn('[kibun:dailyInsight] fetch failed:', error.message);
    }
    return null;
  }

  return data?.insight ?? null;
}

import { supabase } from '@lib/supabase';
import { AIReport, OnboardingProfile } from '@models/index';

export type RequestReportResult =
  | { ok: true; report: AIReport }
  | { ok: false; reason: 'no_entries' | 'subscription_required' | 'ai_unavailable' | 'error' };

function mapRow(row: Record<string, unknown>): AIReport {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    reportType: row.report_type as 'weekly' | 'monthly',
    periodStart: row.period_start as string,
    periodEnd: row.period_end as string,
    content: row.content as string,
    moodSummary: row.mood_summary as AIReport['moodSummary'],
    createdAt: row.created_at as string,
  };
}

export async function requestReport(params: {
  reportType: 'weekly' | 'monthly';
  profile?: Partial<OnboardingProfile>;
}): Promise<RequestReportResult> {
  if (!supabase) return { ok: false, reason: 'error' };

  const { data, error } = await supabase.functions.invoke('generate-report', {
    body: {
      report_type: params.reportType,
      profile: params.profile,
    },
  });

  if (error) {
    if (__DEV__) {
      console.error('[kibun:aiReports] requestReport failed:', error);
    }
    try {
      const body = await (error as { context?: Response }).context?.json?.();
      if (body?.error === 'subscription_required') {
        return { ok: false, reason: 'subscription_required' };
      }
      if (body?.error === 'ai_unavailable') {
        return { ok: false, reason: 'ai_unavailable' };
      }
    } catch {
      // ignore — fall through to generic error
    }
    return { ok: false, reason: 'error' };
  }

  if (!data) return { ok: false, reason: 'error' };

  // Edge function returns { report: null, reason: 'no_entries' } when there is no data
  if (data.reason === 'no_entries' || data.report === null) {
    return { ok: false, reason: 'no_entries' };
  }

  return { ok: true, report: mapRow(data) };
}

export async function getReports(userId: string): Promise<AIReport[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('ai_reports')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    if (__DEV__) {
      console.error('[kibun:aiReports] getReports failed:', error.message);
    }
    return [];
  }

  return (data ?? []).map(mapRow);
}

export async function getLatestReport(
  userId: string,
  reportType: 'weekly' | 'monthly',
): Promise<AIReport | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('ai_reports')
    .select('*')
    .eq('user_id', userId)
    .eq('report_type', reportType)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    if (error && __DEV__) {
      console.error('[kibun:aiReports] getLatestReport failed:', error.message);
    }
    return null;
  }

  return mapRow(data);
}

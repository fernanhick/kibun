import { supabase } from '@lib/supabase';
import { AIReport, OnboardingProfile } from '@models/index';

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
}): Promise<AIReport | null> {
  if (!supabase) return null;

  const { data, error } = await supabase.functions.invoke('generate-report', {
    body: {
      report_type: params.reportType,
      profile: params.profile,
    },
  });

  if (error) {
    if (__DEV__) {
      console.error('[kibun:aiReports] requestReport failed:', error.message);
    }
    return null;
  }

  if (!data || data.report === null) {
    return null;
  }

  return mapRow(data);
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

import { supabase } from '@lib/supabase';
import { AIReport, AIReportStructured, AIReportTone, OnboardingProfile } from '@models/index';
import i18n from '@i18n/index';

export type RequestReportResult =
  | { ok: true; report: AIReport }
  | { ok: false; reason: 'no_entries' | 'subscription_required' | 'ai_unavailable' | 'error' };

const ALLOWED_TONES: ReadonlySet<AIReportTone> = new Set(['positive', 'neutral', 'mixed', 'tough']);

function asString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeMoodSummary(raw: unknown): AIReport['moodSummary'] {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const totalEntries = typeof r.totalEntries === 'number' ? r.totalEntries : 0;
  const avgEntriesPerDay = typeof r.avgEntriesPerDay === 'number' ? r.avgEntriesPerDay : 0;
  const topMoods = Array.isArray(r.topMoods)
    ? (r.topMoods.filter(
        (m): m is { moodId: string; count: number } =>
          !!m && typeof m === 'object' && typeof (m as { moodId?: unknown }).moodId === 'string' && typeof (m as { count?: unknown }).count === 'number',
      ))
    : [];
  if (totalEntries === 0 && topMoods.length === 0 && avgEntriesPerDay === 0) return null;
  return { totalEntries, avgEntriesPerDay, topMoods };
}

function normalizeStructured(raw: unknown): AIReportStructured | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;

  const summary = asString(r.summary);
  if (!summary) return null;

  const nudgeRaw = r.nudge && typeof r.nudge === 'object' ? (r.nudge as Record<string, unknown>) : null;
  const nudgeTitle = nudgeRaw ? asString(nudgeRaw.title) : null;
  const nudgeBody = nudgeRaw ? asString(nudgeRaw.body) : null;
  if (!nudgeTitle || !nudgeBody) return null;

  const patterns = Array.isArray(r.patterns)
    ? r.patterns.map(asString).filter((p): p is string => !!p).slice(0, 6)
    : [];

  let highlight: AIReportStructured['highlight'] = null;
  if (r.highlight && typeof r.highlight === 'object') {
    const h = r.highlight as Record<string, unknown>;
    const label = asString(h.label);
    const detail = asString(h.detail);
    if (label && detail) highlight = { label, detail };
  }

  const toneStr = asString(r.tone);
  const tone: AIReportTone = toneStr && (ALLOWED_TONES as Set<string>).has(toneStr)
    ? (toneStr as AIReportTone)
    : 'neutral';

  return {
    schemaVersion: typeof r.schemaVersion === 'number' ? r.schemaVersion : 1,
    headline: asString(r.headline),
    summary,
    patterns,
    highlight,
    nudge: { title: nudgeTitle, body: nudgeBody },
    tone,
  };
}

function mapRow(row: Record<string, unknown>): AIReport {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    reportType: row.report_type as 'weekly' | 'monthly',
    periodStart: row.period_start as string,
    periodEnd: row.period_end as string,
    content: row.content as string,
    structured: normalizeStructured(row.structured),
    moodSummary: normalizeMoodSummary(row.mood_summary),
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
      language: i18n.language,
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

// Language is required, not optional: this is the display path, so returning a
// report written in a language the user no longer reads is the whole bug. A
// missing match simply yields null and the caller requests a fresh report.
export async function getLatestReport(
  userId: string,
  reportType: 'weekly' | 'monthly',
  language: string,
): Promise<AIReport | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('ai_reports')
    .select('*')
    .eq('user_id', userId)
    .eq('report_type', reportType)
    .eq('language', language)
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

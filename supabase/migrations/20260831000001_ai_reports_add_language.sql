-- Cached AI reports were never tagged with the language they were generated in,
-- and every cache lookup ignored language. The result: the first language a user
-- generated a report in was the language they kept reading.
--
--   annual  — permanent. Keyed on (report_type, period_start) only, so a user who
--             generated their year narrative in English and switched to Spanish
--             read English for the rest of the year with no way to regenerate.
--   monthly — 30 days.
--   weekly  — 7 days.
--   daily   — 1 day (server-side here, plus a client AsyncStorage cache).

alter table public.ai_reports
  add column if not exists language text
  check (language is null or language in ('en', 'es', 'pt', 'de'));

-- ---------------------------------------------------------------------------
-- Backfill
-- ---------------------------------------------------------------------------
-- `profiles` carries no language/locale column, so there is no per-user record
-- of what language a given report was written in. The report body itself is the
-- only evidence available, so we classify on distinctive orthography.
--
-- The tests are ordered most-distinctive first and are deliberately narrow:
-- every marker below is absent from English, so an English report cannot be
-- misclassified into another language. That is the direction that matters — a
-- false positive would hand a Spanish reader an English body labelled 'es',
-- which is the exact bug this migration exists to fix. A false *negative*
-- merely mislabels a non-English report as 'en'; it will read wrongly once and
-- then be replaced on the next generation.
--
-- In practice pt and de should match nothing: both shipped in-app on 2026-08-12
-- (a513f02) and neither has ever had a store listing on either platform, so
-- effectively no user could have discovered the app in those languages. The
-- branches are kept because they cost nothing and make the intent explicit.

update public.ai_reports
set language = case
  -- Tier 1 — orthography that belongs to exactly one of our four locales, so
  -- these tests cannot cross-classify. Checked first for that reason.
  when content ~ '[ñÑ¿¡]'    then 'es'
  when content ~ '[ãõçÃÕÇ]'  then 'pt'
  -- ü is deliberately absent from the German class: Spanish uses it too
  -- (vergüenza, pingüino), so including it would misfile Spanish as German.
  when content ~ '[äößÄÖ]'   then 'de'

  -- Tier 2 — function words. Weaker than orthography, but each is absent from
  -- English and from the other two Romance locales. English words that merely
  -- look foreign (e.g. "muster") are excluded to avoid false positives.
  when content ~* '\m(und|dein|deine|deiner|woche|stimmung)\M' then 'de'
  when content ~* '\m(você|seus|não|padrões)\M'                then 'pt'
  when content ~* '\m(tus|también|días|patrones)\M'             then 'es'

  else 'en'
end
where language is null;

comment on column public.ai_reports.language is
  'Language the report body was generated in. Rows predating 2026-08-31 were backfilled by classifying the body text; see the migration for the heuristic and its failure direction.';

-- The column stays nullable on purpose. All three insert paths now supply a
-- language, but adding NOT NULL here would make this migration unsafe to apply
-- before the Edge Functions are redeployed — old function code would start
-- failing its inserts. Promote it to NOT NULL in a follow-up migration once
-- generate-report, generate-annual-report and generate-daily-insight are live.

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
-- Every cache lookup now filters on language, so it belongs in the index.
-- Weekly/monthly probe (user_id, report_type, language) ordered by created_at;
-- annual and daily probe (user_id, report_type, language, period_start).

create index if not exists idx_ai_reports_user_type_lang
  on public.ai_reports(user_id, report_type, language, created_at desc);

create index if not exists idx_ai_reports_period_lookup
  on public.ai_reports(user_id, report_type, language, period_start);

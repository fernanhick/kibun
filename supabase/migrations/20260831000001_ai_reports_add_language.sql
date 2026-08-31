-- Cached AI reports were never tagged with the language they were generated in,
-- and every cache lookup ignored language. The result: the first language a user
-- generated a report in was the language they kept reading.
--
--   annual  — permanent. Keyed on (report_type, period_start) only, so a user who
--             generated their year narrative in English and switched to Spanish
--             read English for the rest of the year with no way to regenerate.
--   monthly — 30 days.
--   weekly  — 7 days.
--
-- Existing rows are deliberately left NULL rather than backfilled to 'en'. We
-- cannot know what language they hold: es has shipped since launch, and pt/de
-- since 2026-08-12 (a513f02). A row mislabelled 'en' would be served as if it
-- were correct, which is the exact bug being fixed. NULL matches no language
-- filter, so legacy rows are simply never served again and the next request
-- regenerates in the right language.

alter table public.ai_reports
  add column if not exists language text
  check (language is null or language in ('en', 'es', 'pt', 'de'));

comment on column public.ai_reports.language is
  'Language the report body was generated in. NULL means pre-2026-08-31 and of unknown language — never serve these; regenerate instead.';

-- Every cache lookup now filters on language, so it belongs in the index.
-- Weekly/monthly probe (user_id, report_type, language) ordered by created_at;
-- annual probes (user_id, report_type, language, period_start).
create index if not exists idx_ai_reports_user_type_lang
  on public.ai_reports(user_id, report_type, language, created_at desc);

create index if not exists idx_ai_reports_annual_lookup
  on public.ai_reports(user_id, report_type, language, period_start);

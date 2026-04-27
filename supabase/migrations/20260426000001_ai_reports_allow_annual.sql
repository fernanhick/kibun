-- Allow report_type = 'annual' for the Year-in-Review narrative.
-- The original constraint (20260405_create_ai_reports.sql) only permitted
-- 'weekly' and 'monthly', causing the generate-annual-report Edge Function
-- to silently fail when caching its output.

alter table public.ai_reports
  drop constraint if exists ai_reports_report_type_check;

alter table public.ai_reports
  add constraint ai_reports_report_type_check
  check (report_type in ('weekly', 'monthly', 'annual'));

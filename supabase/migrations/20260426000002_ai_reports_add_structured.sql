-- Add a nullable jsonb column for structured AI report payloads.
-- Legacy rows keep `content` as markdown/plain text; new rows populate both
-- `content` (markdown fallback) and `structured` (rich layout payload).

alter table public.ai_reports
  add column if not exists structured jsonb;

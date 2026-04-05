-- AI Reports table for storing OpenAI-generated mood analysis reports.
-- Edge Function inserts via service_role key (bypasses RLS).
-- Users read their own reports via RLS select policy.

create table if not exists public.ai_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  report_type text not null check (report_type in ('weekly', 'monthly')),
  period_start date not null,
  period_end date not null,
  content text not null,
  mood_summary jsonb default '{}',
  created_at timestamptz default now() not null
);

-- Index for fetching user reports efficiently
create index if not exists idx_ai_reports_user_id
  on public.ai_reports(user_id, created_at desc);

-- RLS: users can only read their own reports
alter table public.ai_reports enable row level security;

create policy "Users can read own reports"
  on public.ai_reports for select
  using (auth.uid() = user_id);

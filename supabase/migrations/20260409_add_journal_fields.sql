-- Add AI journaling columns to mood_entries.
-- This repo did not previously include a base schema migration for mood_entries,
-- so bootstrap the minimum required tables idempotently before altering them.

create table if not exists public.mood_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  mood text not null,
  mood_color text,
  note text,
  check_in_slot text not null check (check_in_slot in ('morning', 'afternoon', 'night', 'pre_sleep')),
  logged_at timestamptz not null default now(),
  sentiment_label text check (sentiment_label in ('positive', 'neutral', 'negative')),
  sentiment_score double precision,
  created_at timestamptz not null default now()
);

create index if not exists idx_mood_entries_user_logged_at
  on public.mood_entries(user_id, logged_at desc);

alter table public.mood_entries enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'mood_entries'
      and policyname = 'Users can manage own mood entries'
  ) then
    create policy "Users can manage own mood entries"
      on public.mood_entries
      for all
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end $$;

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  name text,
  age_range text,
  gender text,
  employment text,
  work_setting text,
  work_hours text,
  sleep_hours text,
  exercise text,
  social_frequency text,
  stress_level text,
  goals text[] default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'Users can manage own profile'
  ) then
    create policy "Users can manage own profile"
      on public.profiles
      for all
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end $$;

create table if not exists public.notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  selected_slots jsonb default '[]'::jsonb,
  permission_granted boolean default false,
  streak_nudge_enabled boolean default true,
  custom_times jsonb default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.notification_preferences enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'notification_preferences'
      and policyname = 'Users can manage own notification preferences'
  ) then
    create policy "Users can manage own notification preferences"
      on public.notification_preferences
      for all
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end $$;

alter table public.mood_entries
  add column if not exists journal_prompt text,
  add column if not exists journal_response text;

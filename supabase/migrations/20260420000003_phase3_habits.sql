-- Phase 3: Habit tracker tables

create table if not exists public.habits (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references auth.users(id) on delete cascade not null,
  name          text not null,
  icon          text not null default '✓',
  tracking_type text not null default 'boolean'
                  check (tracking_type in ('boolean', 'scale')),
  display_order integer not null default 0,
  created_at    timestamptz not null default now()
);

create index if not exists idx_habits_user
  on public.habits(user_id);

alter table public.habits enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'habits'
      and policyname = 'Users can manage own habits'
  ) then
    create policy "Users can manage own habits"
      on public.habits for all
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end $$;

create table if not exists public.habit_logs (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users(id) on delete cascade not null,
  habit_id   uuid references public.habits(id) on delete cascade not null,
  log_date   date not null,
  value      integer not null check (value >= 0 and value <= 5),
  created_at timestamptz not null default now(),
  unique(user_id, habit_id, log_date)
);

create index if not exists idx_habit_logs_user_date
  on public.habit_logs(user_id, log_date desc);

alter table public.habit_logs enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'habit_logs'
      and policyname = 'Users can manage own habit logs'
  ) then
    create policy "Users can manage own habit logs"
      on public.habit_logs for all
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end $$;

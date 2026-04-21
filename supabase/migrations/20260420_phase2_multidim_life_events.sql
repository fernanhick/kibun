-- Phase 2: Multi-dimensional check-ins (energy_level, focus_level)
--          and life events log table.

-- Add energy/focus columns to mood_entries
alter table public.mood_entries
  add column if not exists energy_level smallint check (energy_level between 1 and 5),
  add column if not exists focus_level  smallint check (focus_level  between 1 and 5);

-- Life events table
create table if not exists public.life_events (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users(id) on delete cascade not null,
  title      text not null,
  category   text not null check (category in ('work','social','health','travel','relationship','personal')),
  event_date date not null,
  notes      text,
  created_at timestamptz not null default now()
);

create index if not exists idx_life_events_user_date
  on public.life_events(user_id, event_date desc);

alter table public.life_events enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename  = 'life_events'
      and policyname = 'Users can manage own life events'
  ) then
    create policy "Users can manage own life events"
      on public.life_events
      for all
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end $$;

-- Phase 4: Custom moods

create table if not exists public.custom_moods (
  id           text primary key,          -- 'custom_xxxxxx' client-generated
  user_id      uuid references auth.users(id) on delete cascade not null,
  label        text not null check (char_length(label) <= 12),
  color        text not null,
  mood_group   text not null check (mood_group in ('green', 'neutral', 'red-orange', 'blue')),
  created_at   timestamptz not null default now()
);

create index if not exists idx_custom_moods_user
  on public.custom_moods(user_id);

alter table public.custom_moods enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'custom_moods'
      and policyname = 'Users can manage own custom moods'
  ) then
    create policy "Users can manage own custom moods"
      on public.custom_moods for all
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end $$;

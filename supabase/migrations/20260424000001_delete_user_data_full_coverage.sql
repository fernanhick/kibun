-- Extend delete_user_data() to cover every user-owned table.
-- The original function (20260407_delete_user_data_function.sql) only wiped
-- mood_entries, ai_reports, profiles, notification_preferences — leaving
-- life_events, habits, habit_logs, custom_moods, user_achievements, and
-- streak_freezes orphaned on the account after a "Delete My Data" action.

create or replace function public.delete_user_data()
  returns void
  language plpgsql
  security definer
  set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  delete from public.habit_logs               where user_id = auth.uid();
  delete from public.habits                   where user_id = auth.uid();
  delete from public.life_events              where user_id = auth.uid();
  delete from public.custom_moods             where user_id = auth.uid();
  delete from public.user_achievements        where user_id = auth.uid();
  delete from public.streak_freezes           where user_id = auth.uid();
  delete from public.mood_entries             where user_id = auth.uid();
  delete from public.ai_reports               where user_id = auth.uid();
  delete from public.profiles                 where user_id = auth.uid();
  delete from public.notification_preferences where user_id = auth.uid();
end;
$$;

revoke execute on function public.delete_user_data() from public;
grant execute on function public.delete_user_data() to authenticated;

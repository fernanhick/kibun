-- Keep delete_user() symmetric with the expanded delete_user_data() — the
-- auth.users CASCADE already handles every table listed here, but explicit
-- deletion mirrors the existing belt-and-suspenders style of the original
-- function (see 20260407120001_delete_user_function.sql comment).

create or replace function public.delete_user()
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

  delete from auth.users where id = auth.uid();
end;
$$;

revoke execute on function public.delete_user() from public;
grant execute on function public.delete_user() to authenticated;

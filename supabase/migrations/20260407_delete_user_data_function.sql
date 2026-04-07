-- Deletes all user-generated data but preserves the account itself.
-- Covers: mood entries, AI reports, profile, notification preferences.
-- The user remains authenticated and can start fresh.

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

  delete from public.mood_entries           where user_id = auth.uid();
  delete from public.ai_reports             where user_id = auth.uid();
  delete from public.profiles               where user_id = auth.uid();
  delete from public.notification_preferences where user_id = auth.uid();
end;
$$;

revoke execute on function public.delete_user_data() from public;
grant execute on function public.delete_user_data() to authenticated;

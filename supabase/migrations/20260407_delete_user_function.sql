-- Allows authenticated users to delete their own account and all associated data.
-- ai_reports are cleaned up automatically via ON DELETE CASCADE on auth.users.
-- SECURITY DEFINER is required to delete from auth.users as a regular user.

create or replace function public.delete_user()
  returns void
  language plpgsql
  security definer
  set search_path = ''
as $$
begin
  -- Only allow a user to delete their own account
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  -- Delete app data first in case some tables don't have ON DELETE CASCADE.
  delete from public.mood_entries where user_id = auth.uid();
  delete from public.ai_reports where user_id = auth.uid();
  delete from public.profiles where user_id = auth.uid();
  delete from public.notification_preferences where user_id = auth.uid();

  delete from auth.users where id = auth.uid();
end;
$$;

-- Revoke from public, grant only to authenticated users
revoke execute on function public.delete_user() from public;
grant execute on function public.delete_user() to authenticated;

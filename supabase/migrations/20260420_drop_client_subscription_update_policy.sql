-- subscription_status is now authoritative from the RevenueCat webhook only.
-- Clients must not be able to self-report their subscription status.
-- The webhook Edge Function uses the service role key to bypass RLS.
--
-- IMPORTANT: deploy and configure the RevenueCat webhook BEFORE running this
-- migration, otherwise Edge Functions will return subscription_required for
-- all existing subscribers until the webhook backfills their status.
DROP POLICY IF EXISTS "profiles_update_own_subscription" ON public.profiles;

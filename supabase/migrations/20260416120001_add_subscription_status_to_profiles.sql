-- Add subscription_status to profiles so server-side functions can verify
-- entitlement without calling RevenueCat. The app syncs this after every
-- successful purchase and on each startup via resolveSubscriptionStatus().

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS subscription_status TEXT
    NOT NULL DEFAULT 'none'
    CHECK (subscription_status IN ('none', 'trial', 'active', 'expired'));

-- Index for Edge Function lookups (generate-report subscription gate)
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_status
  ON public.profiles(user_id, subscription_status);

-- Allow users to update their own subscription_status.
-- The app writes this after a RevenueCat purchase confirmation.
CREATE POLICY "profiles_update_own_subscription"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Add coping_strategies to profiles so the new onboarding question
-- (profile-coping.tsx) persists. Stored as a text[] array of slugs from
-- src/constants/copingOptions.ts (e.g. 'talk', 'move', 'breathe').
-- The app upserts this via saveProfileToSupabase() at onboarding completion.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS coping_strategies TEXT[];

-- Achievements table: tracks which achievements each user has unlocked
CREATE TABLE IF NOT EXISTS public.user_achievements (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id TEXT NOT NULL,
  unlocked_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, achievement_id)
);

-- Streak freezes table: one row per user per calendar month
-- Allows one free streak freeze per calendar month (Pro feature)
CREATE TABLE IF NOT EXISTS public.streak_freezes (
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month        DATE NOT NULL,      -- stored as the first day of the month, e.g. 2026-04-01
  freeze_used  BOOLEAN NOT NULL DEFAULT FALSE,
  freeze_used_on DATE,
  PRIMARY KEY (user_id, month)
);

-- Enable RLS on both tables
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.streak_freezes ENABLE ROW LEVEL SECURITY;

-- RLS policies: users can only read and write their own rows

CREATE POLICY "user_achievements_select_own"
  ON public.user_achievements
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "user_achievements_insert_own"
  ON public.user_achievements
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "streak_freezes_select_own"
  ON public.streak_freezes
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "streak_freezes_insert_own"
  ON public.streak_freezes
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "streak_freezes_update_own"
  ON public.streak_freezes
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

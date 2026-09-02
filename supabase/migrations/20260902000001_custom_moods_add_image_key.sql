-- Custom moods carry an `imageKey` locally — the face the user picked when
-- creating the mood — but `custom_moods` never had a column to store it. Both
-- write paths silently dropped it and the read path could not return it, so a
-- custom mood synced to a second device (or restored after a reinstall) lost
-- its face. MoodBubble's fallback chain then guessed from the label, or
-- rendered no image at all.
--
-- Custom moods are a Pro feature and cross-device sync is the reason people
-- upgrade, so this landed squarely on paying users. It degraded quietly rather
-- than erroring, which is why it went unnoticed.

alter table public.custom_moods
  add column if not exists image_key text;

comment on column public.custom_moods.image_key is
  'Key into the client MOOD_IMAGES map — the face chosen at creation. Null means the mood predates 2026-09-02 and its label did not resolve to a known face; the client falls back to guessing from the label.';

-- ---------------------------------------------------------------------------
-- Backfill
-- ---------------------------------------------------------------------------
-- The original choice was never persisted anywhere, so it cannot be recovered
-- from storage. What we can do is reproduce exactly what the client already
-- shows today: MoodBubble falls back to normalizeMoodImageKey(label), which is
-- trim → lowercase → collapse whitespace to underscore. Applying the same
-- transform here makes the stored value agree with what users currently see,
-- so the backfill changes no rendering — it just makes the value explicit.
--
-- Labels that do not resolve to one of the 18 bundled faces stay NULL. Those
-- are unrecoverable here (a Spanish "Feliz" cannot be mapped to `happy`
-- without guessing at intent), but they are also recoverable in practice: the
-- client upload below now writes image_key from local state, so any device
-- that still holds the mood will push the real value up on next sync.

update public.custom_moods
set image_key = regexp_replace(lower(trim(label)), '\s+', '_', 'g')
where image_key is null
  and regexp_replace(lower(trim(label)), '\s+', '_', 'g') in (
    'angry', 'bored', 'bright', 'calm', 'cheeky', 'confused',
    'excited', 'frustrated', 'grateful', 'happy', 'lonely', 'loved',
    'melancholy', 'sad', 'scared', 'surprised', 'tired', 'worried'
  );

-- Left nullable on purpose, for the same reason as ai_reports.language: making
-- it NOT NULL would break inserts from app versions that predate this change,
-- and old builds stay in users' hands for weeks after a release.

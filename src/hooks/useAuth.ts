import { useState, useEffect } from 'react';
import * as Crypto from 'expo-crypto';
import { isSupabaseConfigured, supabase } from '@lib/supabase';
import { useSessionStore, useMoodEntryStore } from '@store/index';
import { useAchievementsStore } from '@store/achievementsStore';
import { refreshSubscriptionStatus } from '@lib/revenuecat';
import { MOOD_MAP, type MoodId } from '@constants/moods';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';

async function waitForMoodStoreHydration(): Promise<void> {
  if (useMoodEntryStore.persist.hasHydrated()) return;
  await new Promise<void>((resolve) => {
    const unsubscribe = useMoodEntryStore.persist.onFinishHydration(() => {
      unsubscribe();
      resolve();
    });
  });
}

async function syncMoodEntriesForUser(userId: string): Promise<void> {
  if (!supabase) return;

  await waitForMoodStoreHydration();

  const { data, error } = await supabase
    .from('mood_entries')
    .select('id,mood,note,check_in_slot,logged_at,sentiment_label,sentiment_score,journal_prompt,journal_response')
    .eq('user_id', userId)
    .order('logged_at', { ascending: false });

  if (error) {
    if (__DEV__) {
      console.error('[kibun:sync] Failed to pull mood entries:', error.message);
    }
    return;
  }

  // Replace local entries (which may belong to a previous user) with remote data
  useMoodEntryStore.getState().clearEntries();
  useMoodEntryStore.getState().mergeRemoteEntries((data ?? []).map((row) => ({
    id: row.id,
    moodId: row.mood,
    note: row.note,
    slot: row.check_in_slot,
    loggedAt: row.logged_at,
    sentimentLabel: row.sentiment_label ?? undefined,
    sentimentScore: row.sentiment_score ?? undefined,
    journalPrompt: row.journal_prompt ?? undefined,
    journalResponse: row.journal_response ?? undefined,
  })));
}

/**
 * Uploads all locally-stored mood entries to Supabase for the signed-in user.
 * Uses ignoreDuplicates so existing server entries are never overwritten.
 * This back-fills entries logged while the user was anonymous (local-only)
 * as well as any inserts that failed silently in a previous session.
 */
async function uploadLocalEntriesToSupabase(userId: string): Promise<void> {
  if (!supabase) return;

  await waitForMoodStoreHydration();

  const localEntries = useMoodEntryStore.getState().entries;
  if (localEntries.length === 0) return;

  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  const rows = localEntries.map((entry) => {
    const mood = MOOD_MAP[entry.moodId as MoodId];
    const payload = {
      user_id: userId,
      mood: entry.moodId,
      mood_color: mood?.bubbleColor ?? '#BDBDBD',
      note: entry.note ?? null,
      check_in_slot: entry.slot,
      logged_at: entry.loggedAt,
      sentiment_label: entry.sentimentLabel ?? null,
      sentiment_score: entry.sentimentScore ?? null,
      journal_prompt: entry.journalPrompt ?? null,
      journal_response: entry.journalResponse ?? null,
    };
    return { id: UUID_REGEX.test(entry.id) ? entry.id : Crypto.randomUUID(), ...payload };
  });

  const { error } = await supabase
    .from('mood_entries')
    .upsert(rows, { onConflict: 'id', ignoreDuplicates: true });

  if (error && __DEV__) {
    console.error('[kibun:sync] Failed to upload local entries:', error.message);
  }
}

async function syncAchievementsForUser(userId: string): Promise<void> {
  if (!supabase) return;

  const { data, error } = await supabase
    .from('user_achievements')
    .select('achievement_id')
    .eq('user_id', userId);

  if (error) {
    if (__DEV__) {
      console.error('[kibun:sync] Failed to pull achievements:', error.message);
    }
    return;
  }

  const { addUnlocked } = useAchievementsStore.getState();
  for (const row of data ?? []) {
    addUnlocked(row.achievement_id);
  }
}

async function resolveSubscriptionStatus(isRegistered: boolean) {
  const existingStatus = useSessionStore.getState().session?.subscriptionStatus ?? 'none';
  if (!isRegistered && existingStatus !== 'none') {
    return existingStatus;
  }

  const refreshedStatus = await refreshSubscriptionStatus();
  return refreshedStatus === 'none' ? existingStatus : refreshedStatus;
}

// ─── useAuth ──────────────────────────────────────────────────────────────────
// Initializes Supabase auth and syncs state to the Zustand session store.
//
// Pattern: INITIAL_SESSION event is the single source of truth for startup.
// Supabase v2 fires INITIAL_SESSION automatically on subscribe with the
// persisted session (or null if none). This eliminates the getSession() +
// signInAnonymously() two-step race condition.
//
// Returns: { isReady } — false until auth state is resolved (use to gate rendering)

export function useAuth() {
  const [isReady, setIsReady] = useState(false);
  const { setSession, clearSession } = useSessionStore();

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      clearSession();
      setIsReady(true);
      return;
    }

    const client = supabase;

    const { data: { subscription } } = client.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        if (event === 'INITIAL_SESSION') {
          if (session) {
            // Existing persisted session — restore it
            const isRegistered = !session.user.is_anonymous;
            const subscriptionStatus = await resolveSubscriptionStatus(isRegistered);
            setSession({
              userId: session.user.id,
              authStatus: isRegistered ? 'registered' : 'anonymous',
              subscriptionStatus,
            });

            if (isRegistered) {
              void syncMoodEntriesForUser(session.user.id).then(() =>
                uploadLocalEntriesToSupabase(session.user.id)
              );
              void syncAchievementsForUser(session.user.id);
            }

            setIsReady(true);
          } else {
            // No session — create anonymous identity
            const { error } = await client.auth.signInAnonymously();
            if (error) {
              console.error('[kibun:auth]', { event: 'anon_sign_in_failed', error });
              // App must not hang — allow render even if auth failed
              setIsReady(true);
            }
            // On success: SIGNED_IN fires next and sets isReady
          }
        } else if (event === 'SIGNED_IN') {
          if (session) {
            const isRegistered = !session.user.is_anonymous;
            const subscriptionStatus = await resolveSubscriptionStatus(isRegistered);
            setSession({
              userId: session.user.id,
              authStatus: isRegistered ? 'registered' : 'anonymous',
              subscriptionStatus,
            });

            if (isRegistered) {
              void syncMoodEntriesForUser(session.user.id).then(() =>
                uploadLocalEntriesToSupabase(session.user.id)
              );
              void syncAchievementsForUser(session.user.id);
            }
          }
          setIsReady(true);
        } else if (event === 'USER_UPDATED') {
          if (session) {
            const isRegistered = !session.user.is_anonymous;
            const subscriptionStatus = await resolveSubscriptionStatus(isRegistered);
            setSession({
              userId: session.user.id,
              authStatus: isRegistered ? 'registered' : 'anonymous',
              subscriptionStatus,
            });
          }
        } else if (event === 'TOKEN_REFRESHED') {
          if (session) {
            const isRegistered = !session.user.is_anonymous;
            const subscriptionStatus = await resolveSubscriptionStatus(isRegistered);
            setSession({
              userId: session.user.id,
              authStatus: isRegistered ? 'registered' : 'anonymous',
              subscriptionStatus,
            });
          }
        } else if (event === 'SIGNED_OUT') {
          useMoodEntryStore.getState().clearEntries();
          clearSession();
        }
      }
    );

    // Failsafe: if Supabase auth doesn't resolve in 5s, unblock the app.
    // Covers: .env credentials not configured, network unavailable, Supabase outage.
    // Eliminates the need for isReady=true bypass used in 02-01 and 02-02 verification.
    const authTimeout = setTimeout(() => setIsReady(true), 5000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(authTimeout);
    };
  }, []);

  return { isReady };
}

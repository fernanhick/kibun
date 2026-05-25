import { useState, useEffect } from 'react';
import * as Crypto from 'expo-crypto';
import { isSupabaseConfigured, supabase, withFreshAuth } from '@lib/supabase';
import {
  useSessionStore,
  useMoodEntryStore,
  useHabitsStore,
  useCustomMoodsStore,
  useLifeEventsStore,
} from '@store/index';
import { useAchievementsStore } from '@store/achievementsStore';
import { refreshSubscriptionStatus, loginPurchases, logoutPurchases } from '@lib/revenuecat';
import { syncSubscriptionStatusToSupabase } from '@lib/profileSync';
import { safeParseIsoDate } from '@lib/safeDate';
import { MOOD_MAP, type MoodId } from '@constants/moods';
import type { Habit, HabitLog, CustomMood, LifeEvent, LifeEventCategory, HabitTrackingType, UserSession } from '@models/index';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';

type HydratablePersist = {
  hasHydrated(): boolean;
  onFinishHydration(cb: () => void): () => void;
};

async function waitForStoreHydration(persist: HydratablePersist): Promise<void> {
  if (persist.hasHydrated()) return;
  await new Promise<void>((resolve) => {
    const unsubscribe = persist.onFinishHydration(() => {
      unsubscribe();
      resolve();
    });
  });
}

async function waitForMoodStoreHydration(): Promise<void> {
  await waitForStoreHydration(useMoodEntryStore.persist);
}

async function syncMoodEntriesForUser(userId: string): Promise<void> {
  if (!supabase) return;

  await waitForMoodStoreHydration();

  const { data, error } = await withFreshAuth(() =>
    supabase!
      .from('mood_entries')
      .select('id,mood,note,check_in_slot,logged_at,sentiment_label,sentiment_score,journal_prompt,journal_response')
      .eq('user_id', userId)
      .order('logged_at', { ascending: false })
  );

  if (error) {
    if (__DEV__) {
      console.error('[kibun:sync] Failed to pull mood entries:', error.message);
    }
    return;
  }

  // Merge remote into local. The orchestrator (handleRegisteredUserSync) is
  // responsible for clearing local first on an account switch — keeping this
  // function as a pure merge lets anon-upgrade preserve local data even if
  // the prior upload step partially failed.
  useMoodEntryStore.getState().mergeRemoteEntries((data ?? []).map((row) => {
    // Validate and sanitize loggedAt timestamp
    const loggedAt = safeParseIsoDate(row.logged_at).toISOString();
    return {
      id: row.id,
      moodId: row.mood,
      note: row.note,
      slot: row.check_in_slot,
      loggedAt,
      sentimentLabel: row.sentiment_label ?? undefined,
      sentimentScore: row.sentiment_score ?? undefined,
      journalPrompt: row.journal_prompt ?? undefined,
      journalResponse: row.journal_response ?? undefined,
    };
  }));
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

  const { error } = await withFreshAuth(() =>
    supabase!
      .from('mood_entries')
      .upsert(rows, { onConflict: 'id', ignoreDuplicates: true })
  );

  if (error && __DEV__) {
    console.error('[kibun:sync] Failed to upload local entries:', error.message);
  }
}

async function uploadLocalHabitsToSupabase(userId: string): Promise<void> {
  if (!supabase) return;

  await waitForStoreHydration(useHabitsStore.persist);

  const { habits, logs } = useHabitsStore.getState();
  if (habits.length === 0 && logs.length === 0) return;

  if (habits.length > 0) {
    const habitRows = habits.map((h) => ({
      id: h.id,
      user_id: userId,
      name: h.name,
      icon: h.icon,
      tracking_type: h.trackingType,
      display_order: h.displayOrder,
    }));

    const { error } = await withFreshAuth(() =>
      supabase!
        .from('habits')
        .upsert(habitRows, { onConflict: 'id', ignoreDuplicates: true })
    );

    if (error) {
      if (__DEV__) {
        console.error('[kibun:sync] Failed to upload local habits:', error.message);
      }
      // Don't push logs if habits failed — FK constraint would reject anyway.
      return;
    }
  }

  if (logs.length > 0) {
    const logRows = logs.map((l) => ({
      id: l.id,
      user_id: userId,
      habit_id: l.habitId,
      log_date: l.logDate,
      value: l.value,
    }));

    const { error } = await withFreshAuth(() =>
      supabase!
        .from('habit_logs')
        .upsert(logRows, { onConflict: 'user_id,habit_id,log_date', ignoreDuplicates: true })
    );

    if (error && __DEV__) {
      console.error('[kibun:sync] Failed to upload local habit logs:', error.message);
    }
  }
}

async function uploadLocalCustomMoodsToSupabase(userId: string): Promise<void> {
  if (!supabase) return;

  await waitForStoreHydration(useCustomMoodsStore.persist);

  const moods = useCustomMoodsStore.getState().moods;
  if (moods.length === 0) return;

  const rows = moods.map((m) => ({
    id: m.id,
    user_id: userId,
    label: m.label,
    color: m.color,
    mood_group: m.group,
  }));

  const { error } = await withFreshAuth(() =>
    supabase!
      .from('custom_moods')
      .upsert(rows, { onConflict: 'id', ignoreDuplicates: true })
  );

  if (error && __DEV__) {
    console.error('[kibun:sync] Failed to upload local custom moods:', error.message);
  }
}

async function uploadLocalLifeEventsToSupabase(userId: string): Promise<void> {
  if (!supabase) return;

  await waitForStoreHydration(useLifeEventsStore.persist);

  const events = useLifeEventsStore.getState().events;
  if (events.length === 0) return;

  const rows = events.map((e) => ({
    id: e.id,
    user_id: userId,
    title: e.title,
    category: e.category,
    event_date: e.eventDate,
    notes: e.notes ?? null,
  }));

  const { error } = await withFreshAuth(() =>
    supabase!
      .from('life_events')
      .upsert(rows, { onConflict: 'id', ignoreDuplicates: true })
  );

  if (error && __DEV__) {
    console.error('[kibun:sync] Failed to upload local life events:', error.message);
  }
}

async function syncAchievementsForUser(userId: string): Promise<void> {
  if (!supabase) return;

  const { data, error } = await withFreshAuth(() =>
    supabase!
      .from('user_achievements')
      .select('achievement_id')
      .eq('user_id', userId)
  );

  if (error) {
    if (__DEV__) {
      console.error('[kibun:sync] Failed to pull achievements:', error.message);
    }
    return;
  }

  const ids = (data ?? []).map((row) => row.achievement_id);
  useAchievementsStore.getState().hydrateFromServer(ids);
}

async function syncFreezeForUser(userId: string): Promise<void> {
  if (!supabase) return;

  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

  const { data, error } = await withFreshAuth(() =>
    supabase!
      .from('streak_freezes')
      .select('freeze_used')
      .eq('user_id', userId)
      .eq('month', monthStart)
      .maybeSingle()
  );

  if (error) {
    if (__DEV__) {
      console.error('[kibun:sync] Failed to pull streak freeze:', error.message);
    }
    return;
  }

  useAchievementsStore.getState().hydrateFreezeFromServer(Boolean(data?.freeze_used));
}

async function syncHabitsForUser(userId: string): Promise<void> {
  if (!supabase) return;

  await waitForStoreHydration(useHabitsStore.persist);

  const [habitsRes, logsRes] = await Promise.all([
    withFreshAuth(() =>
      supabase!
        .from('habits')
        .select('id,name,icon,tracking_type,display_order,created_at')
        .eq('user_id', userId)
        .order('display_order', { ascending: true })
    ),
    withFreshAuth(() =>
      supabase!
        .from('habit_logs')
        .select('id,habit_id,log_date,value')
        .eq('user_id', userId)
    ),
  ]);

  if (habitsRes.error || logsRes.error) {
    if (__DEV__) {
      console.error('[kibun:sync] Failed to pull habits:', habitsRes.error?.message ?? logsRes.error?.message);
    }
    return;
  }

  const habits: Habit[] = (habitsRes.data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    icon: row.icon,
    trackingType: row.tracking_type as HabitTrackingType,
    displayOrder: row.display_order,
    createdAt: row.created_at,
  }));

  const logs: HabitLog[] = (logsRes.data ?? []).map((row) => ({
    id: row.id,
    habitId: row.habit_id,
    logDate: row.log_date,
    value: row.value,
  }));

  useHabitsStore.getState().mergeRemote(habits, logs);
}

async function syncCustomMoodsForUser(userId: string): Promise<void> {
  if (!supabase) return;

  await waitForStoreHydration(useCustomMoodsStore.persist);

  const { data, error } = await withFreshAuth(() =>
    supabase!
      .from('custom_moods')
      .select('id,label,color,mood_group,created_at')
      .eq('user_id', userId)
  );

  if (error) {
    if (__DEV__) {
      console.error('[kibun:sync] Failed to pull custom moods:', error.message);
    }
    return;
  }

  const moods: CustomMood[] = (data ?? []).map((row) => ({
    id: row.id,
    label: row.label,
    color: row.color,
    group: row.mood_group as CustomMood['group'],
    createdAt: row.created_at,
  }));

  useCustomMoodsStore.getState().mergeRemote(moods);
}

async function syncLifeEventsForUser(userId: string): Promise<void> {
  if (!supabase) return;

  await waitForStoreHydration(useLifeEventsStore.persist);

  const { data, error } = await withFreshAuth(() =>
    supabase!
      .from('life_events')
      .select('id,title,category,event_date,notes,created_at')
      .eq('user_id', userId)
      .order('event_date', { ascending: false })
  );

  if (error) {
    if (__DEV__) {
      console.error('[kibun:sync] Failed to pull life events:', error.message);
    }
    return;
  }

  const events: LifeEvent[] = (data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    category: row.category as LifeEventCategory,
    eventDate: row.event_date,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
  }));

  useLifeEventsStore.getState().mergeRemoteEvents(events);
}

// Orchestrates data flow when an auth event resolves to a registered user.
//
// Three cases:
//   1. Anon→registered upgrade (same auth.uid()): upload local data to Supabase
//      FIRST, then pull canonical state. Without this, the sync would replace
//      local anon data with an empty remote and the data would be lost.
//   2. Account switch (different userId, no SIGNED_OUT fired in between): clear
//      residual data from the previous account before pulling the new one. This
//      handles edge cases where Supabase doesn't emit SIGNED_OUT before a
//      same-session account swap.
//   3. Normal sign-in / app start: just pull. Local is already empty (after a
//      prior SIGNED_OUT) or already matches remote (same user resuming).
async function handleRegisteredUserSync(
  userId: string,
  prevSession: UserSession | null | undefined,
): Promise<void> {
  const isUpgrade =
    prevSession?.authStatus === 'anonymous' && prevSession.userId === userId;
  const isAccountSwitch =
    !!prevSession && prevSession.userId !== userId;

  if (isUpgrade) {
    // Idempotent upserts: re-uploading on a subsequent fire is a no-op.
    await Promise.all([
      uploadLocalEntriesToSupabase(userId),
      uploadLocalHabitsToSupabase(userId),
      uploadLocalCustomMoodsToSupabase(userId),
      uploadLocalLifeEventsToSupabase(userId),
    ]);
  } else if (isAccountSwitch) {
    useMoodEntryStore.getState().clearEntries();
    useHabitsStore.getState().clearAll();
    useCustomMoodsStore.getState().clearAll();
    useLifeEventsStore.getState().clearEvents();
  }

  void syncMoodEntriesForUser(userId);
  void syncHabitsForUser(userId);
  void syncCustomMoodsForUser(userId);
  void syncLifeEventsForUser(userId);
  void syncAchievementsForUser(userId);
  void syncFreezeForUser(userId);
}

async function resolveSubscriptionStatus(
  isRegistered: boolean,
  userId?: string,
) {
  // Screenshot/demo override: force a specific user to "active" without RevenueCat.
  // Set EXPO_PUBLIC_FORCE_PRO_USER_ID only in screenshot builds; remove before release.
  const forceProUserId = process.env.EXPO_PUBLIC_FORCE_PRO_USER_ID;
  if (userId && forceProUserId && userId === forceProUserId) {
    // Sync to DB so edge functions (which gate on profiles.subscription_status) also see 'active'.
    syncSubscriptionStatusToSupabase(userId, 'active');
    return 'active';
  }

  const existingStatus = useSessionStore.getState().session?.subscriptionStatus ?? 'none';
  if (!isRegistered && existingStatus !== 'none') {
    return existingStatus;
  }

  const refreshedStatus = await refreshSubscriptionStatus();
  const resolved = refreshedStatus === 'none' ? existingStatus : refreshedStatus;

  // Keep Supabase in sync so Edge Functions can gate on subscription_status
  // without calling RevenueCat. Fire-and-forget — never blocks auth resolution.
  if (userId && resolved !== 'none') {
    syncSubscriptionStatusToSupabase(userId, resolved);
  }

  return resolved;
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
            // No predictive refresh: each sync call self-heals on JWT expired
            // via withFreshAuth. user.id and is_anonymous don't change on
            // refresh, so reading session directly is safe.
            const isRegistered = !session.user.is_anonymous;
            const prevSession = useSessionStore.getState().session;
            const subscriptionStatus = await resolveSubscriptionStatus(isRegistered, session.user.id);
            setSession({
              userId: session.user.id,
              authStatus: isRegistered ? 'registered' : 'anonymous',
              subscriptionStatus,
            });

            if (isRegistered) {
              void loginPurchases(session.user.id);
              void handleRegisteredUserSync(session.user.id, prevSession);
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
            const prevSession = useSessionStore.getState().session;
            const subscriptionStatus = await resolveSubscriptionStatus(isRegistered, session.user.id);
            setSession({
              userId: session.user.id,
              authStatus: isRegistered ? 'registered' : 'anonymous',
              subscriptionStatus,
            });

            if (isRegistered) {
              void loginPurchases(session.user.id);
              void handleRegisteredUserSync(session.user.id, prevSession);
            }
          }
          setIsReady(true);
        } else if (event === 'USER_UPDATED') {
          if (session) {
            const isRegistered = !session.user.is_anonymous;
            const prevSession = useSessionStore.getState().session;
            const subscriptionStatus = await resolveSubscriptionStatus(isRegistered, session.user.id);
            setSession({
              userId: session.user.id,
              authStatus: isRegistered ? 'registered' : 'anonymous',
              subscriptionStatus,
            });

            // Anon→registered upgrade fires as USER_UPDATED (updateUser flow).
            // The orchestrator handles the upload-before-sync sequence on detection.
            if (isRegistered) {
              void handleRegisteredUserSync(session.user.id, prevSession);
            }
          }
        } else if (event === 'TOKEN_REFRESHED') {
          if (session) {
            const isRegistered = !session.user.is_anonymous;
            const subscriptionStatus = await resolveSubscriptionStatus(isRegistered, session.user.id);
            setSession({
              userId: session.user.id,
              authStatus: isRegistered ? 'registered' : 'anonymous',
              subscriptionStatus,
            });
          }
        } else if (event === 'SIGNED_OUT') {
          void logoutPurchases();
          useMoodEntryStore.getState().clearEntries();
          useHabitsStore.getState().clearAll();
          useCustomMoodsStore.getState().clearAll();
          useLifeEventsStore.getState().clearEvents();
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

import { useState, useEffect } from 'react';
import { isSupabaseConfigured, supabase } from '@lib/supabase';
import { useSessionStore } from '@store/index';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';

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
            setSession({
              userId: session.user.id,
              authStatus: session.user.is_anonymous ? 'anonymous' : 'registered',
              subscriptionStatus: 'none',
            });
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
            setSession({
              userId: session.user.id,
              authStatus: session.user.is_anonymous ? 'anonymous' : 'registered',
              subscriptionStatus: 'none',
            });
          }
          setIsReady(true);
        } else if (event === 'USER_UPDATED') {
          if (session) {
            setSession({
              userId: session.user.id,
              authStatus: session.user.is_anonymous ? 'anonymous' : 'registered',
              subscriptionStatus: 'none',
            });
          }
        } else if (event === 'TOKEN_REFRESHED') {
          if (session) {
            setSession({
              userId: session.user.id,
              authStatus: session.user.is_anonymous ? 'anonymous' : 'registered',
              subscriptionStatus: 'none',
            });
          }
        } else if (event === 'SIGNED_OUT') {
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

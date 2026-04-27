import { createClient, type SupabaseClient, type Session } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { AppState } from 'react-native';

// ─── SecureStore Adapter ──────────────────────────────────────────────────────
// Supabase auth requires a storage adapter that persists JWT and refresh tokens.
// AsyncStorage is unencrypted — SecureStore is required for auth tokens.
// (Non-sensitive session metadata: userId, authStatus → sessionStore via AsyncStorage)
const ExpoSecureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

// ─── Environment Validation ───────────────────────────────────────────────────
// Fail fast at module load — a missing env var here causes confusing auth errors
// downstream, not an obvious initialization failure.
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

if (!isSupabaseConfigured) {
  console.error(
    '[kibun] Supabase is not configured. Set EXPO_PUBLIC_SUPABASE_URL and ' +
    'EXPO_PUBLIC_SUPABASE_ANON_KEY for EAS build profiles.'
  );
}

// ─── Supabase Client ──────────────────────────────────────────────────────────
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        storage: ExpoSecureStoreAdapter,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false, // Required for React Native — no URL-based session detection
        flowType: 'pkce', // PKCE sends tokens as ?code= query params — Android strips # fragments
      },
    })
  : null;

// Supabase's auto-refresh timer can stop while the app is backgrounded. Tie it
// to AppState so the JWT is refreshed as soon as the user returns — prevents
// "JWT expired" on the first PostgREST call after a long background.
if (supabase) {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase!.auth.startAutoRefresh();
    else supabase!.auth.stopAutoRefresh();
  });
}

// `onAuthStateChange` fires INITIAL_SESSION with whatever's in storage — which
// can be an already-expired access token on cold start. Call this before using
// that session for data requests to guarantee a valid JWT.
//
// Threshold is 5 minutes: a sync chain (pull → upload → achievements → freeze)
// can take several seconds, and the JWT must outlast the longest request in it.
const FRESH_SESSION_THRESHOLD_SEC = 300;

export async function ensureFreshSession(session: Session): Promise<Session> {
  if (!supabase) return session;
  const expiresAt = session.expires_at ?? 0;
  const nowSec = Math.floor(Date.now() / 1000);
  if (expiresAt - nowSec > FRESH_SESSION_THRESHOLD_SEC) return session;

  const { data, error } = await supabase.auth.refreshSession();
  if (error || !data.session) {
    if (__DEV__) console.warn('[kibun:auth] refreshSession failed:', error?.message);
    return session;
  }
  return data.session;
}

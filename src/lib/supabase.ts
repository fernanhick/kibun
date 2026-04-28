import { createClient, type SupabaseClient } from '@supabase/supabase-js';
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

// Reactive JWT recovery: PostgREST is the only authoritative signal that the
// access token is bad. Predictive freshness checks race with the SDK's own
// auto-refresh timer (token rotation produces "Already Used" errors). Instead,
// run the request, and on `JWT expired` force a refresh and retry exactly once.
type SupabaseResult = { error: { message?: string; code?: string } | null };

export async function withFreshAuth<R extends SupabaseResult>(
  call: () => PromiseLike<R>,
): Promise<R> {
  const first = await call();
  if (!first.error) return first;

  const isExpired =
    first.error.code === 'PGRST301' ||
    /jwt expired/i.test(first.error.message ?? '');
  if (!isExpired || !supabase) return first;

  const { error: refreshError } = await supabase.auth.refreshSession();
  // "Already Used" means a concurrent refresh already rotated the token —
  // the client's in-memory session is now fresh, so the retry will succeed.
  if (refreshError && __DEV__) {
    console.warn('[kibun:auth] refreshSession failed:', refreshError.message);
  }
  return await call();
}

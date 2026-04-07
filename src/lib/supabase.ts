import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';

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
      },
    })
  : null;

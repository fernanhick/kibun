import { createClient } from '@supabase/supabase-js';
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

if (!supabaseUrl) {
  throw new Error(
    '[kibun] Missing EXPO_PUBLIC_SUPABASE_URL. Add it to your .env file (see .env.example).'
  );
}
if (!supabaseAnonKey) {
  throw new Error(
    '[kibun] Missing EXPO_PUBLIC_SUPABASE_ANON_KEY. Add it to your .env file (see .env.example).'
  );
}

// ─── Supabase Client ──────────────────────────────────────────────────────────
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // Required for React Native — no URL-based session detection
  },
});

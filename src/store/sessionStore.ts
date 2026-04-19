// SECURITY NOTE: This store persists non-sensitive session metadata only
// (userId, authStatus, subscriptionStatus).
// Supabase JWT tokens and refresh tokens MUST be stored via expo-secure-store in Plan 01-02.
// Do NOT persist raw credentials or tokens in this store.

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserSession, SubscriptionStatus } from '@models/index';

interface SessionState {
  session: UserSession | null;
  _hasHydrated: boolean;
  setSession: (session: UserSession) => void;
  clearSession: () => void;
  setSubscriptionStatus: (status: SubscriptionStatus) => void;
  setHasHydrated: (value: boolean) => void;
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      session: null,
      _hasHydrated: false,
      setSession: (session) => set({ session }),
      clearSession: () => set({ session: null }),
      setSubscriptionStatus: (status) =>
        set((state) => ({
          session: state.session
            ? { ...state.session, subscriptionStatus: status }
            : null,
        })),
      setHasHydrated: (value) => set({ _hasHydrated: value }),
    }),
    {
      name: 'kibun-session',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ session: state.session }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);

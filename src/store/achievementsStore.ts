import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';
import { supabase } from '@lib/supabase';
import { useSessionStore } from './sessionStore';

interface AchievementsState {
  /** IDs of achievements the user has unlocked. */
  unlockedIds: string[];
  /** Whether the streak freeze was used this calendar month. */
  freezeUsedThisMonth: boolean;
  /** YYYY-MM of the month when freezeUsedThisMonth was set. Null when no freeze used. */
  freezeUsedMonth: string | null;
  /** YYYY-MM of the last month a retro-check was performed. */
  lastRetroMonth: string | null;

  addUnlocked: (id: string) => void;
  /** Merge server-side achievement IDs into local state without writing back to Supabase. */
  hydrateFromServer: (ids: string[]) => void;
  useFreezeThisMonth: () => void;
  resetFreezeForMonth: () => void;
  /** Set freeze-used flag from server data without writing back to Supabase. */
  hydrateFreezeFromServer: (used: boolean) => void;
  /** Clear freezeUsedThisMonth if the stored month no longer matches the current month. */
  ensureFreshFreezeMonth: () => void;
  setLastRetroMonth: (month: string) => void;
}

/** Returns the YYYY-MM key for the current month in the device's local timezone. */
function currentMonthKey(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

/** Returns the first day of the current month as a YYYY-MM-DD string (UTC-safe). */
function currentMonthStart(): string {
  return `${currentMonthKey()}-01`;
}

/** Returns today as a YYYY-MM-DD string in the device's local timezone. */
function todayDateString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export const useAchievementsStore = create<AchievementsState>()(
  persist(
    (set, get) => ({
      unlockedIds: [],
      freezeUsedThisMonth: false,
      freezeUsedMonth: null,
      lastRetroMonth: null,

      addUnlocked: (id) => {
        if (!get().unlockedIds.includes(id)) {
          set((state) => ({ unlockedIds: [...state.unlockedIds, id] }));

          // Fire-and-forget sync to Supabase for registered users
          const session = useSessionStore.getState().session;
          if (session?.authStatus === 'registered' && supabase) {
            supabase
              .from('user_achievements')
              .upsert(
                { user_id: session.userId, achievement_id: id },
                { onConflict: 'user_id,achievement_id', ignoreDuplicates: true }
              )
              .then(({ error }) => {
                if (error && __DEV__) {
                  console.error('[kibun:achievements] Supabase upsert failed:', error.message);
                }
              });
          }
        }
      },
      hydrateFromServer: (ids) =>
        set((state) => {
          if (ids.length === 0) return state;
          const merged = new Set(state.unlockedIds);
          for (const id of ids) merged.add(id);
          if (merged.size === state.unlockedIds.length) return state;
          return { unlockedIds: Array.from(merged) };
        }),
      useFreezeThisMonth: () => {
        get().ensureFreshFreezeMonth();
        if (get().freezeUsedThisMonth) return;
        const month = currentMonthKey();
        set({ freezeUsedThisMonth: true, freezeUsedMonth: month });

        const session = useSessionStore.getState().session;
        if (session?.authStatus === 'registered' && supabase) {
          supabase
            .from('streak_freezes')
            .upsert(
              {
                user_id: session.userId,
                month: currentMonthStart(),
                freeze_used: true,
                freeze_used_on: todayDateString(),
              },
              { onConflict: 'user_id,month' }
            )
            .then(({ error }) => {
              if (error && __DEV__) {
                console.error('[kibun:achievements] Streak-freeze upsert failed:', error.message);
              }
            });
        }
      },
      resetFreezeForMonth: () => set({ freezeUsedThisMonth: false, freezeUsedMonth: null }),
      hydrateFreezeFromServer: (used) =>
        set({ freezeUsedThisMonth: used, freezeUsedMonth: used ? currentMonthKey() : null }),
      ensureFreshFreezeMonth: () => {
        const { freezeUsedThisMonth, freezeUsedMonth } = get();
        if (freezeUsedThisMonth && freezeUsedMonth !== currentMonthKey()) {
          set({ freezeUsedThisMonth: false, freezeUsedMonth: null });
        }
      },
      setLastRetroMonth: (month) => set({ lastRetroMonth: month }),
    }),
    {
      name: 'kibun-achievements',
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
      migrate: (persistedState, version) => {
        if (version < 1 && persistedState && typeof persistedState === 'object') {
          const state = persistedState as Partial<AchievementsState>;
          return {
            ...state,
            freezeUsedMonth: state.freezeUsedThisMonth ? currentMonthKey() : null,
          };
        }
        return persistedState as AchievementsState;
      },
      onRehydrateStorage: () => (state) => {
        state?.ensureFreshFreezeMonth();
      },
    }
  )
);

// Self-correct stale freeze flag when the app returns to foreground after a
// month rollover (long-lived sessions otherwise keep last month's flag).
if (AppState?.addEventListener) {
  AppState.addEventListener('change', (next) => {
    if (next === 'active') {
      useAchievementsStore.getState().ensureFreshFreezeMonth();
    }
  });
}

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@lib/supabase';
import { useSessionStore } from './sessionStore';

interface AchievementsState {
  /** IDs of achievements the user has unlocked. */
  unlockedIds: string[];
  /** Whether the streak freeze was used this calendar month. */
  freezeUsedThisMonth: boolean;
  /** YYYY-MM of the last month a retro-check was performed. */
  lastRetroMonth: string | null;

  addUnlocked: (id: string) => void;
  useFreezeThisMonth: () => void;
  resetFreezeForMonth: () => void;
  setLastRetroMonth: (month: string) => void;
}

export const useAchievementsStore = create<AchievementsState>()(
  persist(
    (set, get) => ({
      unlockedIds: [],
      freezeUsedThisMonth: false,
      lastRetroMonth: null,

      addUnlocked: (id) => {
        if (!get().unlockedIds.includes(id)) {
          set((state) => ({ unlockedIds: [...state.unlockedIds, id] }));

          // Fire-and-forget sync to Supabase for registered users
          const session = useSessionStore.getState().session;
          if (session?.authStatus === 'registered' && supabase) {
            supabase
              .from('user_achievements')
              .insert({ user_id: session.userId, achievement_id: id })
              .then(({ error }) => {
                if (error && __DEV__) {
                  console.error('[kibun:achievements] Supabase insert failed:', error.message);
                }
              });
          }
        }
      },
      useFreezeThisMonth: () => set({ freezeUsedThisMonth: true }),
      resetFreezeForMonth: () => set({ freezeUsedThisMonth: false }),
      setLastRetroMonth: (month) => set({ lastRetroMonth: month }),
    }),
    {
      name: 'kibun-achievements',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

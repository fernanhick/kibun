import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface DailyInsightState {
  insight: { date: string; content: string } | null;
  isLoading: boolean;
  _hasHydrated: boolean;
  setInsight: (date: string, content: string) => void;
  setLoading: (v: boolean) => void;
  setHasHydrated: (value: boolean) => void;
}

export const useDailyInsightStore = create<DailyInsightState>()(
  persist(
    (set) => ({
      insight: null,
      isLoading: false,
      _hasHydrated: false,
      setInsight: (date, content) => set({ insight: { date, content } }),
      setLoading: (v) => set({ isLoading: v }),
      setHasHydrated: (value) => set({ _hasHydrated: value }),
    }),
    {
      name: 'kibun-daily-insight',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ insight: state.insight }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);

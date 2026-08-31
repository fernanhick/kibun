import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

// `language` is part of the cache identity, not decoration: the insight body is
// model-generated in the user's language, so a cached English insight must not
// satisfy a Spanish reader. Entries written before 2026-08-31 have no language
// and are treated as a miss.
interface DailyInsightState {
  insight: { date: string; language?: string; content: string } | null;
  isLoading: boolean;
  _hasHydrated: boolean;
  setInsight: (date: string, language: string, content: string) => void;
  setLoading: (v: boolean) => void;
  setHasHydrated: (value: boolean) => void;
}

export const useDailyInsightStore = create<DailyInsightState>()(
  persist(
    (set) => ({
      insight: null,
      isLoading: false,
      _hasHydrated: false,
      setInsight: (date, language, content) => set({ insight: { date, language, content } }),
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

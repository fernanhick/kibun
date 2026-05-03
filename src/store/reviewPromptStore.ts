import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface ReviewPromptState {
  firstSeenAt: number | null;
  askedCount: number;
  lastAskedAt: number | null;
  hasRatedHint: boolean;
  hasGivenFeedback: boolean;
  _hasHydrated: boolean;
  setHasHydrated: (value: boolean) => void;
  markFirstSeen: () => void;
  recordAsked: () => void;
  markRatedHint: () => void;
  markFeedbackGiven: () => void;
}

export const useReviewPromptStore = create<ReviewPromptState>()(
  persist(
    (set, get) => ({
      firstSeenAt: null,
      askedCount: 0,
      lastAskedAt: null,
      hasRatedHint: false,
      hasGivenFeedback: false,
      _hasHydrated: false,
      setHasHydrated: (value) => set({ _hasHydrated: value }),
      markFirstSeen: () => {
        if (get().firstSeenAt === null) set({ firstSeenAt: Date.now() });
      },
      recordAsked: () =>
        set((state) => ({
          askedCount: state.askedCount + 1,
          lastAskedAt: Date.now(),
        })),
      markRatedHint: () => set({ hasRatedHint: true }),
      markFeedbackGiven: () => set({ hasGivenFeedback: true }),
    }),
    {
      name: 'kibun-review-prompt',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        firstSeenAt: state.firstSeenAt,
        askedCount: state.askedCount,
        lastAskedAt: state.lastAskedAt,
        hasRatedHint: state.hasRatedHint,
        hasGivenFeedback: state.hasGivenFeedback,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
        state?.markFirstSeen();
      },
    }
  )
);

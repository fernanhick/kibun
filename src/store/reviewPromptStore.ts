import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

/** Keep a bounded history — only the rolling-year window is ever read. */
const MAX_TRACKED_STORE_ASKS = 5;

interface ReviewPromptState {
  firstSeenAt: number | null;
  /**
   * Timestamps of every time we sent the user toward the store — the OS sheet
   * or the write-review fallback. Read as a rolling window, which is what the
   * platforms themselves enforce. Replaces the old `askedCount`/`lastAskedAt`
   * pair, which counted cheap dismissals against the same budget as real asks.
   */
  storeAsksAt: number[];
  /**
   * Set only once we know the user actually landed on the store's write-review
   * page. This is the ONE outcome we can observe: iOS never reports whether
   * its sheet displayed, let alone whether a rating was left. The old
   * `hasRatedHint` was set on mere intent and was a permanent stop, so a single
   * tap on Settings → "Rate kibun" silenced the prompt for the life of the
   * install even when nothing had appeared on screen.
   */
  hasReachedStore: boolean;
  /** When the user last wrote in via "Send feedback". Drives its own cooldown. */
  lastFeedbackAt: number | null;
  _hasHydrated: boolean;

  setHasHydrated: (value: boolean) => void;
  markFirstSeen: () => void;
  /** Records that we sent the user toward the store. */
  recordStoreAsk: () => void;
  /** Records the one confirmable outcome: the write-review page was opened. */
  markReachedStore: () => void;
  recordFeedback: () => void;
}

export const useReviewPromptStore = create<ReviewPromptState>()(
  persist(
    (set, get) => ({
      firstSeenAt: null,
      storeAsksAt: [],
      hasReachedStore: false,
      lastFeedbackAt: null,
      _hasHydrated: false,

      setHasHydrated: (value) => set({ _hasHydrated: value }),
      markFirstSeen: () => {
        if (get().firstSeenAt === null) set({ firstSeenAt: Date.now() });
      },
      recordStoreAsk: () =>
        set((state) => ({
          storeAsksAt: [...state.storeAsksAt, Date.now()].slice(-MAX_TRACKED_STORE_ASKS),
        })),
      markReachedStore: () => set({ hasReachedStore: true }),
      recordFeedback: () => set({ lastFeedbackAt: Date.now() }),
    }),
    {
      name: 'kibun-review-prompt',
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
      partialize: (state) => ({
        firstSeenAt: state.firstSeenAt,
        storeAsksAt: state.storeAsksAt,
        hasReachedStore: state.hasReachedStore,
        lastFeedbackAt: state.lastFeedbackAt,
      }),
      migrate: (persistedState, version) => {
        if (version >= 1 || !persistedState || typeof persistedState !== 'object') {
          return persistedState as ReviewPromptState;
        }
        // v0 → v1. The old shape was { askedCount, lastAskedAt, hasRatedHint,
        // hasGivenFeedback }. Exact history is unrecoverable, so seed the
        // closest honest equivalent from the one timestamp it kept.
        const old = persistedState as {
          firstSeenAt?: number | null;
          lastAskedAt?: number | null;
          hasRatedHint?: boolean;
          hasGivenFeedback?: boolean;
        };
        const lastAsked = old.lastAskedAt ?? null;

        // `hasRatedHint` is deliberately NOT carried over as `hasReachedStore`.
        // It was set on intent rather than outcome, so treating it as proof of
        // a rating would preserve the bug it represents: users who never saw a
        // sheet stay silenced forever. Converting it to a store-ask timestamp
        // keeps them under the normal cooldown instead — at worst they are
        // asked again after the window, on a positive moment, at most 3x/year.
        const seededAsk = old.hasRatedHint ? (lastAsked ?? Date.now()) : lastAsked;

        return {
          firstSeenAt: old.firstSeenAt ?? null,
          storeAsksAt: seededAsk ? [seededAsk] : [],
          hasReachedStore: false,
          lastFeedbackAt: old.hasGivenFeedback ? (lastAsked ?? Date.now()) : null,
        } as ReviewPromptState;
      },
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
        state?.markFirstSeen();
      },
    }
  )
);

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface TourState {
  hasSeenTour: boolean;
  _hasHydrated: boolean;
  markTourSeen: () => void;
  resetTour: () => void;
  setHasHydrated: (value: boolean) => void;
}

export const useTourStore = create<TourState>()(
  persist(
    (set) => ({
      hasSeenTour: false,
      _hasHydrated: false,
      markTourSeen: () => set({ hasSeenTour: true }),
      resetTour: () => set({ hasSeenTour: false }),
      setHasHydrated: (value) => set({ _hasHydrated: value }),
    }),
    {
      name: 'kibun-tour',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ hasSeenTour: state.hasSeenTour }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);

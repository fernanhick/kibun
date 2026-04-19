import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface UiPrefsState {
  bannerDismissedAt: number | null;
  _hasHydrated: boolean;
  dismissBanner: () => void;
  resetBanner: () => void;
  setHasHydrated: (value: boolean) => void;
}

export const useUiPrefsStore = create<UiPrefsState>()(
  persist(
    (set) => ({
      bannerDismissedAt: null,
      _hasHydrated: false,
      dismissBanner: () => set({ bannerDismissedAt: Date.now() }),
      resetBanner: () => set({ bannerDismissedAt: null }),
      setHasHydrated: (value) => set({ _hasHydrated: value }),
    }),
    {
      name: 'kibun-ui-prefs',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ bannerDismissedAt: state.bannerDismissedAt }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);

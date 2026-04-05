import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface UiPrefsState {
  bannerDismissedAt: number | null;
  dismissBanner: () => void;
  resetBanner: () => void;
}

export const useUiPrefsStore = create<UiPrefsState>()(
  persist(
    (set) => ({
      bannerDismissedAt: null,
      dismissBanner: () => set({ bannerDismissedAt: Date.now() }),
      resetBanner: () => set({ bannerDismissedAt: null }),
    }),
    {
      name: 'kibun-ui-prefs',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

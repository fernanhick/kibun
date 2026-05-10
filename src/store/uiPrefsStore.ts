import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type LanguagePref = 'system' | 'en' | 'es';

interface UiPrefsState {
  bannerDismissedAt: number | null;
  language: LanguagePref;
  _hasHydrated: boolean;
  dismissBanner: () => void;
  resetBanner: () => void;
  setLanguage: (lang: LanguagePref) => void;
  setHasHydrated: (value: boolean) => void;
}

export const useUiPrefsStore = create<UiPrefsState>()(
  persist(
    (set) => ({
      bannerDismissedAt: null,
      language: 'system',
      _hasHydrated: false,
      dismissBanner: () => set({ bannerDismissedAt: Date.now() }),
      resetBanner: () => set({ bannerDismissedAt: null }),
      setLanguage: (language) => set({ language }),
      setHasHydrated: (value) => set({ _hasHydrated: value }),
    }),
    {
      name: 'kibun-ui-prefs',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        bannerDismissedAt: state.bannerDismissedAt,
        language: state.language,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);

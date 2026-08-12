import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type LanguagePref = 'system' | 'en' | 'es' | 'pt' | 'de';
export type ThemePref = 'system' | 'light' | 'dark';

interface UiPrefsState {
  bannerDismissedAt: number | null;
  language: LanguagePref;
  themePreference: ThemePref;
  _hasHydrated: boolean;
  dismissBanner: () => void;
  resetBanner: () => void;
  setLanguage: (lang: LanguagePref) => void;
  setThemePreference: (pref: ThemePref) => void;
  setHasHydrated: (value: boolean) => void;
}

export const useUiPrefsStore = create<UiPrefsState>()(
  persist(
    (set) => ({
      bannerDismissedAt: null,
      language: 'system',
      themePreference: 'system',
      _hasHydrated: false,
      dismissBanner: () => set({ bannerDismissedAt: Date.now() }),
      resetBanner: () => set({ bannerDismissedAt: null }),
      setLanguage: (language) => set({ language }),
      setThemePreference: (themePreference) => set({ themePreference }),
      setHasHydrated: (value) => set({ _hasHydrated: value }),
    }),
    {
      name: 'kibun-ui-prefs',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        bannerDismissedAt: state.bannerDismissedAt,
        language: state.language,
        themePreference: state.themePreference,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);

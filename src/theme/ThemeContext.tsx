import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { colors as lightColors } from '@constants/theme';
import { useUiPrefsStore } from '@store/uiPrefsStore';

// The light palette in @constants/theme is `as const`, so its inferred type
// is a record of string-literal types. ThemePalette widens that shape to
// `string` per key so the dark palette can supply different values while
// `satisfies ThemePalette` still forces every key to be present.
export type ThemePalette = { readonly [K in keyof typeof lightColors]: string };

const darkColors = {
  primary: '#4A86FF',
  primaryLight: '#1A2540',
  primaryDark: '#7BA8FF',
  skyStart: '#3F83F8',
  skyEnd: '#63CCFF',
  sparkle: '#1F2538',
  warmCtaStart: '#FFB22E',
  warmCtaEnd: '#FFD959',
  chipSurface: 'rgba(255, 255, 255, 0.06)',
  chipBorder: 'rgba(123, 168, 255, 0.30)',
  accent: '#FFA62B',
  accentLight: '#2A2418',
  accentBorder: '#5B4019',
  pink: '#FF6B9D',
  pinkEnd: '#C77DFF',
  pinkLight: 'rgba(255, 107, 157, 0.15)',
  pinkBorder: 'rgba(255, 107, 157, 0.30)',
  background: '#0E1322',
  surface: '#161B2C',
  surfaceElevated: '#1F2538',
  text: '#F5F7FF',
  textSecondary: '#9EA4C2',
  textDisabled: '#5C6080',
  textInverse: '#1A1A2E',
  border: '#262B40',
  borderLight: '#1B1F30',
  success: '#66BB6A',
  warning: '#FFA726',
  error: '#EF5350',
  errorLight: '#3A1F22',
  overlay: 'rgba(0, 0, 0, 0.6)',
} as const satisfies ThemePalette;

export interface ThemeValue {
  colors: ThemePalette;
  isDark: boolean;
  resolved: 'light' | 'dark';
}

const ThemeContext = createContext<ThemeValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const themePreference = useUiPrefsStore((s) => s.themePreference);
  const systemScheme = useColorScheme();

  const resolved: 'light' | 'dark' =
    themePreference === 'system'
      ? systemScheme === 'dark'
        ? 'dark'
        : 'light'
      : themePreference;

  const value = useMemo<ThemeValue>(
    () => ({
      colors: resolved === 'dark' ? darkColors : lightColors,
      isDark: resolved === 'dark',
      resolved,
    }),
    [resolved],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return ctx;
}

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { colors as lightColors } from '@constants/theme';

// The light palette in @constants/theme is `as const`, so its inferred type
// is a record of string-literal types. ThemePalette widens that shape to
// `string` per key so the dark palette can supply different values while
// `satisfies ThemePalette` still forces every key to be present.
export type ThemePalette = { readonly [K in keyof typeof lightColors]: string };

// Dark variant of "Grounded Calm" — "Sage Night": sage/clay/rose accents on a
// deep desaturated GREEN-SLATE base (biophilic, low-arousal — not pure black,
// which reads harsh). Neutrals carry a subtle sage undertone; text is a soft
// off-white (#ECEFEA), not pure white. Brand hues are lightened so dark text
// (textInverse) stays legible on filled accents.
const darkColors = {
  primary: '#74AD9A',
  primaryLight: '#1E2A25',
  primaryDark: '#9CCBBB',
  skyStart: '#74AD9A',
  skyEnd: '#6FB3A4',
  sparkle: '#20251F',
  warmCtaStart: '#D2855B',
  warmCtaEnd: '#E0A878',
  chipSurface: 'rgba(255, 255, 255, 0.06)',
  chipBorder: 'rgba(111, 165, 147, 0.30)',
  accent: '#D2855B',
  accentLight: '#2A2118',
  accentBorder: '#5B4327',
  pink: '#CE8A97',
  pinkEnd: '#B58FB0',
  pinkLight: 'rgba(206, 138, 151, 0.15)',
  pinkBorder: 'rgba(206, 138, 151, 0.30)',
  background: '#161B19',
  surface: '#1F2522',
  surfaceElevated: '#28302C',
  text: '#ECEFEA',
  textSecondary: '#A8B0AA',
  textDisabled: '#6B726C',
  textInverse: '#141815',
  border: '#333B36',
  borderLight: '#232A26',
  success: '#6FB385',
  warning: '#E0A23E',
  error: '#E07268',
  errorLight: '#33201C',
  successLight: '#1C2A20',
  successText: '#8FD3A6',
  successBorder: '#305A41',
  warningLight: '#2C2416',
  warningText: '#E6B566',
  warningBorder: '#5A4624',
  errorText: '#E89A92',
  errorBorder: '#5A3330',
  overlay: 'rgba(0, 0, 0, 0.6)',
} as const satisfies ThemePalette;

export interface ThemeValue {
  colors: ThemePalette;
  isDark: boolean;
  resolved: 'light' | 'dark';
}

const ThemeContext = createContext<ThemeValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Dark mode is disabled for now — always render the light palette. The
  // `darkColors` palette above is kept so it can be re-enabled later.
  void darkColors;
  const value = useMemo<ThemeValue>(
    () => ({ colors: lightColors, isDark: false, resolved: 'light' as const }),
    [],
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

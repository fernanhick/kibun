import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Appearance, type ColorSchemeName } from 'react-native';
import { colors as lightColors } from '@constants/theme';
import { useUiPrefsStore } from '@store/uiPrefsStore';

// The light palette in @constants/theme is `as const`, so its inferred type
// is a record of string-literal types. ThemePalette widens that shape to
// `string` per key so the dark palette can supply different values while
// `satisfies ThemePalette` still forces every key to be present.
export type ThemePalette = { readonly [K in keyof typeof lightColors]: string };

// ─── "Kibun Night" ────────────────────────────────────────────────────────────
// Dark variant of "Kibun Bloom". Base is a deep warm PLUM-CHARCOAL, not the
// green-slate the old sage-branded dark palette used and not pure black (which
// reads harsh and clips OLED detail). Neutrals carry a rose undertone so the
// brand hue never looks like it was pasted onto a grey app.
//
// Two inversions to know about when reading this file:
//   • `primaryDark` is LIGHTER than `primary` here. Its role is "the readable
//     brand tone on a tinted brand surface", which flips with the mode.
//   • The hero gradient (skyStart/skyEnd) is LIGHT in dark mode, so the text
//     sitting on it — textInverse / onPrimary / sparkle — goes dark.
//
// Contrast, verified with src/lib/contrast.ts against WCAG 2.1 AA:
//   text on background        15.68:1   textSecondary on background  8.07:1
//   textSecondary on surfaceElevated 6.73:1
//   onPrimary on primary       8.13:1   onPrimary on warmCtaEnd      5.33:1
//   sparkle on skyStart         6.05:1   sparkle on skyEnd            6.27:1
//   primaryDark on primaryLight 8.47:1   secondaryDark on secondaryLight 9.13:1
//   successText on successLight 8.45:1   warningText on warningLight  8.84:1
//   errorText on errorLight     7.13:1   sunshineText on sunshineLight 8.58:1
// Non-text UI components against the 3:1 bar:
//   success 8.00:1 · warning 8.30:1 · error 5.57:1 · primary on surface 7.58:1
const darkColors = {
  // Brand — rose, lightened so it carries on a dark ground
  primary: '#F08FAD',
  primaryLight: '#3A222C',
  primaryDark: '#F7B3C8',
  // Hero gradient inverts: light rose → light plum, with dark ink on top
  skyStart: '#E9799C',
  skyEnd: '#C08CD6',
  sparkle: '#2E1822',
  warmCtaStart: '#E9799C',
  warmCtaEnd: '#D96288',
  chipSurface: 'rgba(255, 255, 255, 0.06)',
  chipBorder: 'rgba(240, 143, 173, 0.30)',
  accent: '#F08FAD',
  accentLight: '#3A222C',
  accentBorder: '#5C3341',
  // Secondary — sage, growth/habits only
  secondary: '#7FCDB4',
  secondaryLight: '#1C2E29',
  secondaryDark: '#9BDCC6',
  secondaryBorder: '#2F5D4E',
  // Sunshine — amber, celebration only
  sunshine: '#F0B968',
  sunshineLight: '#2E2417',
  sunshineText: '#F0B968',
  sunshineBorder: '#5B4526',
  // Legacy `pink*` keys — folded into the rose family, same as in light mode
  pink: '#F08FAD',
  pinkEnd: '#C08CD6',
  pinkLight: 'rgba(240, 143, 173, 0.14)',
  pinkBorder: 'rgba(240, 143, 173, 0.30)',
  // Surfaces — warm plum-charcoal
  background: '#171215',
  surface: '#1F1920',
  surfaceElevated: '#2A222A',
  // Text
  text: '#F2EAEE',
  textSecondary: '#B7A7AE',
  textDisabled: '#6E6068',
  textInverse: '#1A1116',
  onPrimary: '#1A1116',
  // Borders
  border: '#3A3038',
  borderLight: '#2A222A',
  hairline: '#2E2630',
  // Glass chrome
  glassTint: 'rgba(23, 18, 21, 0.72)',
  glassBorder: 'rgba(240, 143, 173, 0.16)',
  // Status
  success: '#4FBF7B',
  warning: '#E0A23E',
  error: '#E0685E',
  errorLight: '#33201F',
  successLight: '#1A2C20',
  successText: '#8FD3A6',
  successBorder: '#2F5A3E',
  warningLight: '#2E2417',
  warningText: '#EDBE72',
  warningBorder: '#5B4526',
  errorText: '#F09A92',
  errorBorder: '#5C3330',
  overlay: 'rgba(0, 0, 0, 0.65)',
} as const satisfies ThemePalette;

export interface ThemeValue {
  colors: ThemePalette;
  isDark: boolean;
  resolved: 'light' | 'dark';
}

const ThemeContext = createContext<ThemeValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  // The user's stored choice: 'system' | 'light' | 'dark'. It has been
  // persisted by uiPrefsStore all along — it was simply never read, because
  // the provider used to hardcode the light palette.
  const preference = useUiPrefsStore((s) => s.themePreference);
  const hasHydrated = useUiPrefsStore((s) => s._hasHydrated);

  // Widened past ColorSchemeName on purpose: Appearance.getColorScheme() can
  // return null (no preference reported) or undefined on some platforms, and
  // the RN type for ColorSchemeName does not admit undefined.
  const [systemScheme, setSystemScheme] = useState<ColorSchemeName | null | undefined>(() =>
    Appearance.getColorScheme(),
  );

  useEffect(() => {
    const sub = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemScheme(colorScheme);
    });
    return () => sub.remove();
  }, []);

  const value = useMemo<ThemeValue>(() => {
    // Until the persisted preference has rehydrated, follow the OS. Defaulting
    // to light instead would make a dark-mode user watch the app flash white on
    // every cold start.
    const effective = !hasHydrated || preference === 'system' ? systemScheme : preference;
    const isDark = effective === 'dark';
    return {
      colors: isDark ? darkColors : lightColors,
      isDark,
      resolved: isDark ? 'dark' : 'light',
    };
  }, [preference, hasHydrated, systemScheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return ctx;
}

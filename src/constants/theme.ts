// ─── Colors ───────────────────────────────────────────────────────────────────
// UI palette — "Grounded Calm". Low-arousal, biophilic wellness theme:
// muted sage (growth/balance) + soft light-beige surfaces (safety) + a warm
// rose-pink accent for action (replaced the original clay/brown). Desaturated
// on purpose — bright/high-arousal hues raise arousal & cortisol, the opposite
// of what a mood tool wants. Mood-specific colors live in src/constants/moods.ts.
// Dark mode is currently disabled (ThemeContext forces the light palette).
//
// Contrast (verified WCAG 2.1, white text on solid fills):
//   white on primary       4.88:1  ✓ AA   white on primaryDark 7.07:1  ✓ AA
//   white on skyEnd        5.07:1  ✓ AA   (Button primary gradient end)
//   white on warmCtaStart  5.41:1  ✓ AA   white on warmCtaEnd  5.73:1  ✓ AA
//   white on accent        4.81:1  ✓ AA   (clay accent — also safe as text on light)
//   text on background    13.0:1   ✓ AA   textSecondary on bg  4.81:1  ✓ AA
// PINK & STATUS are for icons / borders / fills and LARGE/heading text only —
// not AA for normal-weight body text on light surfaces. For error body text,
// use colors.text on colors.errorLight instead.
export const colors = {
  // Brand — muted sage
  primary: '#4C7A6A',
  primaryLight: '#E7EFEA',
  primaryDark: '#3A6051',
  skyStart: '#4C7A6A',
  skyEnd: '#44786A',
  sparkle: '#FBF7F1',
  // CTA — warm rose-pink (replaces the old clay). Deep enough that white text
  // and pink-as-text both clear WCAG AA on light surfaces.
  warmCtaStart: '#BE5276',
  warmCtaEnd: '#AC4869',
  chipSurface: 'rgba(255, 255, 255, 0.95)',
  chipBorder: 'rgba(76, 122, 106, 0.22)',
  // Accent — rose-pink (was clay/brown). Doubles as fill + text, so kept deep.
  accent: '#B0496A',
  accentLight: '#FBE7EF',
  accentBorder: '#F2C7D7',
  // Rose accent (emotional / personal screens) — muted, not candy
  pink: '#BC6B7A',
  pinkEnd: '#9E6E97',
  pinkLight: 'rgba(188, 107, 122, 0.10)',
  pinkBorder: 'rgba(188, 107, 122, 0.25)',
  // Background — soft light beige
  background: '#F4EEE2',
  surface: '#FBF6EC',
  surfaceElevated: '#FFFFFF',
  // Text — warm ink, not pure black
  text: '#2A2A26',
  textSecondary: '#6E6B63',
  textDisabled: '#AEACA4', // Intentionally low contrast — disabled elements are WCAG-exempt
  textInverse: '#FFFFFF',
  // Border — warm
  border: '#E5E0D6',
  borderLight: '#F0EBE1',
  // Status (icons/borders/fills/large text only — see annotation above)
  success: '#5E9E73',
  warning: '#E0A23E',
  error: '#D9594E',
  errorLight: '#F7E4E1',
  // Semantic tint surfaces — for status chips / banners. Pairs a soft tint bg
  // with readable text + border. Light mode = pastels; dark mode (ThemeContext)
  // = deep tints with light text. (Blue/"info" banners map to sage primary*.)
  successLight: '#E8F5E9',
  successText: '#2E7D32',
  successBorder: '#A5D6A7',
  warningLight: '#FFF4DF',
  warningText: '#8A5A00',
  warningBorder: '#FFD8B0',
  errorText: '#B23B30',
  errorBorder: '#E8B0AA',
  // Overlay
  overlay: 'rgba(42, 42, 38, 0.5)',
} as const;

// ─── Typography ───────────────────────────────────────────────────────────────
export const typography = {
  fonts: {
    // Fredoka (rounded display face) is reserved for big titles/headers — it
    // carries the warm brand personality without making body copy look childish.
    // UI labels & body run on Nunito Sans, a humanist sans that reads calmer and
    // more grown-up. Named weight files: fontWeight in styles is cosmetic only.
    display: 'Fredoka_700Bold',
    ui: 'NunitoSans_600SemiBold',
    body: 'NunitoSans_400Regular',
    bodyBold: 'NunitoSans_700Bold',
  },
  sizes: {
    xs: 11,
    sm: 13,
    md: 15,
    body: 16,
    lg: 18,
    xl: 22,
    xxl: 28,
    display: 36,
  },
  weights: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
  lineHeights: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
} as const;

// ─── Spacing (8pt grid) ───────────────────────────────────────────────────────
export const spacing = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
  // Named aliases for common use
  xs: 4,
  sm: 8,
  md: 16,
  lg: 20,
  xl: 28,
  xxl: 40,
  screenPadding: 16,
} as const;

// ─── Border Radius ────────────────────────────────────────────────────────────
// "Tight & crisp" scale — intentionally restrained corners read sharper and more
// professional than soft/pill rounding, while still pairing with the rounded
// Fredoka display face. `full`/`bubble` stay circular (avatars, mood bubbles).
export const radius = {
  none: 0,
  sm: 3,
  md: 6,
  lg: 8,
  xl: 12,
  xxl: 14,
  full: 9999,
  // Specific UI patterns
  button: 8,
  card: 12,
  bubble: 9999,
} as const;

// ─── Motion ───────────────────────────────────────────────────────────────────
// Spring presets feed react-native-reanimated's `withSpring(value, preset)`.
// Timing values are in ms — use for `withTiming` / fade durations.
// Scale values are press-state targets for SpringPressable.
export const motion = {
  spring: {
    gentle: { damping: 18, stiffness: 120 },
    snappy: { damping: 14, stiffness: 180 },
    bouncy: { damping: 10, stiffness: 220 },
  },
  timing: {
    fast: 180,
    medium: 280,
    slow: 420,
  },
  scale: {
    pressed: 0.96,
    pressedSmall: 0.94,
  },
} as const;

// ─── Shadows (cross-platform) ─────────────────────────────────────────────────
// iOS uses shadowColor/shadowOffset/shadowOpacity/shadowRadius.
// Android uses elevation.
// Tiers follow modern soft-elevation: wider radii + larger y-offsets at very
// low opacities. Each tier roughly doubles perceived lift over the previous.
export const shadows = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  sm: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  md: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.10,
    shadowRadius: 18,
    elevation: 6,
  },
  lg: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.14,
    shadowRadius: 24,
    elevation: 9,
  },
} as const;

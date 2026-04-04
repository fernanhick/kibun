// ─── Colors ───────────────────────────────────────────────────────────────────
// UI palette — not mood-specific (see src/constants/moods.ts for mood colors).
//
// STATUS COLORS — for icons, borders, and background fills ONLY.
// Do NOT use as text color on white/light backgrounds: contrast ratios are
// below WCAG 2.1 AA (4.5:1) for normal-weight text.
//   success: 2.6:1 on white  ✗
//   error:   3.7:1 on white  ✗
//   warning: 2.9:1 on white  ✗
// For error text: use colors.text (#1A1A2E) on colors.errorLight (#FFEBEE) instead.
export const colors = {
  // Brand
  primary: '#6C63FF',
  primaryLight: '#EAE9FF',
  primaryDark: '#4B44CC',
  // Background
  background: '#FFFFFF',
  surface: '#F8F8FC',
  surfaceElevated: '#FFFFFF',
  // Text
  text: '#1A1A2E',
  textSecondary: '#6B6B8A',
  textDisabled: '#AEAEBC', // Intentionally low contrast — disabled elements are WCAG-exempt
  textInverse: '#FFFFFF',
  // Border
  border: '#E5E5EF',
  borderLight: '#F0F0F8',
  // Status (icons/borders/fills only — see annotation above)
  success: '#4CAF50',
  warning: '#FF9800',
  error: '#F44336',
  errorLight: '#FFEBEE',
  // Overlay
  overlay: 'rgba(26, 26, 46, 0.5)',
} as const;

// ─── Typography ───────────────────────────────────────────────────────────────
export const typography = {
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
  lg: 24,
  xl: 32,
  xxl: 48,
  screenPadding: 20,
} as const;

// ─── Border Radius ────────────────────────────────────────────────────────────
export const radius = {
  none: 0,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 24,
  full: 9999,
  // Specific UI patterns
  button: 12,
  card: 16,
  bubble: 9999,
} as const;

// ─── Shadows (cross-platform) ─────────────────────────────────────────────────
// iOS uses shadowColor/shadowOffset/shadowOpacity/shadowRadius.
// Android uses elevation.
// Both sets of props are included — React Native applies each on the correct platform.
export const shadows = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  sm: {
    shadowColor: '#1A1A2E',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#1A1A2E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#1A1A2E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 16,
    elevation: 8,
  },
} as const;

import { breakpoints } from './breakpoints';

// Phone-correct base geometry. Tablet sizing is applied via getKawaiiTabScale
// at render time — do NOT bump these "to make tablets look bigger" because
// these values dictate phone layout (icons clip at the screen edge if larger).
export const KAWAII_TAB_BAR_HEIGHT = 72;
export const KAWAII_TAB_NOTCH_RADIUS = 52;
export const KAWAII_TAB_CURVE_DEPTH = 14;
export const KAWAII_TAB_MASCOT_SIZE = 110;

// The mascot is vertically centered in the tab row and shifted upward with a negative margin.
// This resolves to ~63px of visual overlap above the tab bar container top.
// Screen.tsx scales this by getKawaiiTabScale on tablets.
export const KAWAII_TAB_MASCOT_OVERLAP = 63;

// Total vertical area that can cover scroll content above the bottom edge.
export const KAWAII_TAB_VISUAL_OBSTRUCTION =
  KAWAII_TAB_BAR_HEIGHT + KAWAII_TAB_CURVE_DEPTH + KAWAII_TAB_MASCOT_OVERLAP;

export const KAWAII_TAB_SAFE_BOTTOM_MIN = 8;
export const KAWAII_TAB_SAFE_BOTTOM_ANDROID = 8;

// Canonical phone-vs-tablet scale factor for content (mood bubbles, mascots,
// tab-bar geometry). Window-derived via useResponsive/useWindowDimensions so
// iPad split-screen / Stage Manager fall back to phone sizes correctly.
//   ≥1200dp (tabletXl, iPad 13" landscape, Tab Ultra landscape) → 1.6
//   ≥ 900dp (tabletLg, iPad 13" portrait, iPad 11" landscape)   → 1.45
//   ≥ 600dp (tablet,   iPad mini/10.9"/Pro 11" portrait)         → 1.3
//   else                                                         → 1.0
export function getContentScale(width: number): number {
  if (width >= breakpoints.tabletXl) return 1.6;
  if (width >= breakpoints.tabletLg) return 1.45;
  if (width >= breakpoints.tablet) return 1.3;
  return 1;
}

// Width-based scale for tab bar geometry. Tab icons and the mascot would
// otherwise look dwarfed on tablet viewports — bump them proportionally.
export function getKawaiiTabScale(width: number): number {
  return getContentScale(width);
}
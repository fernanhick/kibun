import { breakpoints } from './breakpoints';

// ─── Floating tab bar geometry ────────────────────────────────────────────────
// This replaced the "Kawaii" shelf tab bar, which cost 149dp of PERMANENT
// bottom chrome (72 bar + 14 notch curve + 63 mascot overlap) — roughly 18% of
// an iPhone viewport, on every screen, forever. The mascot moved to the home
// hero, where it can be large and expressive instead of acting as chrome.
//
// The pill floats: it is inset from all three edges and content scrolls
// beneath it, per the iOS 26 Liquid Glass treatment.
export const TAB_BAR_HEIGHT = 64;
/** Inset from the left/right screen edges. */
export const TAB_BAR_MARGIN = 16;
/** Gap between the bottom of the pill and the safe-area edge. */
export const TAB_BAR_BOTTOM_GAP = 10;

// On Android the system nav bar is hidden (sticky immersive, see app/_layout),
// so insets.bottom fluctuates when the user swipes to reveal it. A fixed value
// keeps the pill from jumping. On iOS the real safe-area inset is used.
export const TAB_BAR_SAFE_BOTTOM_MIN = 8;
export const TAB_BAR_SAFE_BOTTOM_ANDROID = 10;

/**
 * Total vertical area the floating bar can cover, measured from the safe-area
 * edge. Screens add this to their scroll `paddingBottom` so the last row of
 * content can always clear the pill.
 *
 * Was 149. Now 74 + the platform safe inset.
 */
export const TAB_BAR_VISUAL_OBSTRUCTION = TAB_BAR_HEIGHT + TAB_BAR_BOTTOM_GAP;

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

/**
 * Scale for tab-bar geometry. Deliberately gentler than getContentScale — the
 * old bar scaled 1:1 with content, which on a 13" iPad produced a 100dp-tall
 * bar with 224px mascot. A floating pill only needs to grow enough to stay
 * proportionate, and it is width-clamped on tablets anyway.
 */
export function getTabBarScale(width: number): number {
  if (width >= breakpoints.tabletLg) return 1.2;
  if (width >= breakpoints.tablet) return 1.1;
  return 1;
}

import { breakpoints } from './breakpoints';

// ─── Tab bar geometry ─────────────────────────────────────────────────────────
// Lineage: the "Kawaii" shelf bar cost 149dp of PERMANENT bottom chrome (72 bar
// + 14 notch curve + 63 mascot overlap) — roughly 18% of an iPhone viewport, on
// every screen, forever. The mascot moved to the home hero, where it can be
// large and expressive instead of acting as chrome.
//
// It was then replaced by a floating "Liquid Glass" pill, inset from all three
// edges with content scrolling beneath it. That is now gone too: the bar is
// DOCKED — full-bleed, flush to the bottom, opaque, laid out BELOW the screen
// rather than over it. See BottomTabBar for why.
//
// TAB_BAR_MARGIN (16) and TAB_BAR_BOTTOM_GAP (10) were removed with the pill;
// a docked bar has no edge insets to describe.
/**
 * Content height of the docked bar, excluding the safe-area padding below it.
 *
 * 64 was inherited from the floating pill, which needed the bulk to read as a
 * discrete object hovering over content. A docked bar does not: at 64 the
 * content (22 icon + 2 gap + ~13 label ≈ 37) left ~27dp of dead padding, which
 * is what made the bar look oversized. 52 leaves ~15dp — tight but still a
 * comfortable target, and the Pressable adds hitSlop on top.
 */
export const TAB_BAR_HEIGHT = 52;

// On Android the system nav bar is hidden (sticky immersive, see app/_layout),
// so insets.bottom fluctuates when the user swipes to reveal it. A fixed value
// keeps the pill from jumping. On iOS the real safe-area inset is used.
export const TAB_BAR_SAFE_BOTTOM_MIN = 8;
export const TAB_BAR_SAFE_BOTTOM_ANDROID = 10;

/**
 * Vertical area the tab bar covers that screens must pad around.
 *
 * **Zero, deliberately.** The bar is docked now (see BottomTabBar): React
 * Navigation lays it out below the screen, so the screen viewport already
 * excludes it and nothing overlaps. Screens adding padding here would open a
 * dead gap above the bar on every tab.
 *
 * History: 149 for the old Kawaii shelf, 74 for the floating pill (which DID
 * overlap content — and the one screen that under-reserved it, Insights, ended
 * up with its chart labels trapped behind the bar). Keep this the single place
 * that decides the question.
 */
export const TAB_BAR_VISUAL_OBSTRUCTION = 0;

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

export const KAWAII_TAB_BAR_HEIGHT = 72;
export const KAWAII_TAB_NOTCH_RADIUS = 52;
export const KAWAII_TAB_CURVE_DEPTH = 14;
export const KAWAII_TAB_MASCOT_SIZE = 110;

// The mascot is vertically centered in the tab row and shifted upward with a negative margin.
// This resolves to ~63px of visual overlap above the tab bar container top.
export const KAWAII_TAB_MASCOT_OVERLAP = 63;

// Total vertical area that can cover scroll content above the bottom edge.
export const KAWAII_TAB_VISUAL_OBSTRUCTION =
  KAWAII_TAB_BAR_HEIGHT + KAWAII_TAB_CURVE_DEPTH + KAWAII_TAB_MASCOT_OVERLAP;

export const KAWAII_TAB_SAFE_BOTTOM_MIN = 8;
export const KAWAII_TAB_SAFE_BOTTOM_ANDROID = 8;
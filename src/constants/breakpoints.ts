// ─── Breakpoints ──────────────────────────────────────────────────────────────
// Width-based layout buckets. `tablet` matches Android's sw600dp qualifier:
// every real tablet in portrait clears it, every phone in portrait does not.
// `tabletLg` gates two-column layouts — avoids cramped narrow columns on
// small tablets (iPad mini portrait is 744dp, still below 900).
export const breakpoints = {
  phone: 0,
  phoneWide: 480,
  tablet: 600,
  tabletLg: 900,
  tabletXl: 1200,
} as const;

export type Breakpoint = keyof typeof breakpoints;

// Max content width per bucket. Content above these widths centers with the
// leftover space going to the margins.
export const SCREEN_MAX_WIDTH = {
  phone: 480,
  tablet: 720,
  tabletLg: 920,
} as const;

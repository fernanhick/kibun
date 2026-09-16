// ─── Colors ───────────────────────────────────────────────────────────────────
// UI palette — "Kibun Bloom". Kawaii-forward: the chrome is raised to meet the
// mood hues instead of fighting them.
//
// WHY THIS REPLACED "Grounded Calm":
// The mood bubbles in src/constants/moods.ts are already bright and playful
// (Material-400 hues — #66BB6A happy, #EF5350 angry, #FFB74D worried). The old
// chrome was deliberately desaturated sage + beige, so the app read as two
// different products stacked on each other, and the chrome won because it
// covers more pixels. The store listing had already settled this argument:
// ROSE #B0496A is the confirmed brand colour (DailyBean owns green, Finch owns
// blue, Tochi owns cream — nobody owns rose, and it signals "cute"), and sage
// #4C7A6A was explicitly rejected as "too muted". This palette brings the app
// in line with its own storefront.
//
// STRUCTURE — one accent + neutrals. Do not add a fourth accent family.
//   primary   ROSE   — brand. Every CTA, active state, link, focus ring.
//   secondary SAGE   — growth/habits only (habit checks, streak rails).
//   sunshine  AMBER  — celebration only (milestones, streak flames).
//   mood hues        — owned by moods.ts. Never restyle them here.
//
// Contrast — every pair below was verified against WCAG 2.1 AA (4.5:1) with
// src/lib/contrast.ts before being committed. Light mode:
//   white on primary        5.24:1   white on warmCtaEnd     6.48:1
//   white on skyStart       5.24:1   white on skyEnd         5.96:1
//   sparkle on skyStart     4.72:1   sparkle on skyEnd       5.36:1
//   white on secondary      4.94:1   white on sunshine       4.70:1
//   text on background     14.97:1   textSecondary on bg     5.94:1
//   primaryDark on primaryLight 6.17:1
// Dark mode ("Kibun Night") is verified to the same bar in ThemeContext.
//
// `textDisabled` is intentionally sub-AA — disabled controls are WCAG-exempt.
export const colors = {
  // ─── Brand — rose (the ASO-confirmed brand colour) ──────────────────────
  primary: '#B0496A',
  primaryLight: '#FCE7EE',
  primaryDark: '#8E3A55',
  // Hero gradient — rose → plum. Plum appears ONLY as a gradient terminus; it
  // is not a standalone accent. Darkened from the first draft (#C2567B), which
  // measured 4.28:1 against white and missed AA.
  skyStart: '#AE4A6E',
  skyEnd: '#8B4E85',
  // On-gradient secondary text. Named `sparkle` for backwards compatibility
  // with existing call sites; it is really "the muted ink for hero surfaces",
  // so in dark mode it flips to a dark value (the hero gradient inverts).
  sparkle: '#FFEFF5',
  // ─── CTA — solid brand rose, the deepest tone in the system so it always
  // reads as the strongest affordance on screen. ───────────────────────────
  warmCtaStart: '#B0496A',
  warmCtaEnd: '#9A3F5D',
  chipSurface: 'rgba(255, 255, 255, 0.92)',
  chipBorder: 'rgba(176, 73, 106, 0.22)',
  // ─── Accent — an alias of the brand rose. Kept as its own key because ~40
  // call sites use `accent*`; collapsing it onto primary is the point — it
  // removes the old rose-vs-sage-vs-mauve split. ──────────────────────────
  accent: '#B0496A',
  accentLight: '#FCE7EE',
  accentBorder: '#F3C9D8',
  // ─── Secondary — sage. Growth / habits only. ────────────────────────────
  secondary: '#2F7D68',
  secondaryLight: '#E3F3EE',
  secondaryDark: '#2A6E5C',
  secondaryBorder: '#BFE0D6',
  // ─── Sunshine — amber. Celebration only (milestones, streak flames). ────
  sunshine: '#A8631C',
  sunshineLight: '#FFF1DA',
  sunshineText: '#8A5406',
  sunshineBorder: '#F5D9A8',
  // ─── `pink*` — legacy keys, now folded into the rose family. Previously a
  // third competing accent (mauve #BC6B7A). Aliasing rather than deleting
  // keeps ~25 call sites compiling; they now render as brand rose. ────────
  pink: '#B0496A',
  pinkEnd: '#8B4E85',
  pinkLight: 'rgba(176, 73, 106, 0.09)',
  pinkBorder: 'rgba(176, 73, 106, 0.24)',
  // ─── Background — warm blush cream (was flat beige #F4EEE2) ─────────────
  background: '#FFF7F1',
  surface: '#FFFCF9',
  surfaceElevated: '#FFFFFF',
  // ─── Text — warm ink with a rose undertone, never pure black ────────────
  text: '#2B1F24',
  textSecondary: '#6E5B62',
  textDisabled: '#B3A2A8', // Sub-AA on purpose — disabled elements are WCAG-exempt
  textInverse: '#FFFFFF',
  // `onPrimary` is the correct label for "text sitting on a primary fill".
  // Prefer it over textInverse at new call sites — in dark mode they diverge.
  onPrimary: '#FFFFFF',
  // ─── Border ─────────────────────────────────────────────────────────────
  border: '#EBD9DE',
  borderLight: '#F5E9EC',
  // True 1px separator inside cards/lists. Lighter than `border` on purpose —
  // a divider should not read as strongly as a container edge.
  hairline: '#F3E4E8',
  // ─── Glass (Liquid Glass chrome: tab bar, scroll-aware headers) ─────────
  glassTint: 'rgba(255, 247, 241, 0.72)',
  glassBorder: 'rgba(176, 73, 106, 0.14)',
  // ─── Status ─────────────────────────────────────────────────────────────
  // These three are for ICONS / BORDERS / FILLS and large text only — they are
  // verified against the 3:1 WCAG bar for non-text UI components, not the 4.5:1
  // body-text bar. For status body copy use `successText` / `warningText` /
  // `errorText` on their matching `*Light` tint. (`warning` was #D08A12, which
  // measured only 2.71:1 on the background and failed even the 3:1 bar.)
  success: '#2F9E5A', // 3.22:1 on background
  warning: '#B0740C', // 3.71:1 on background
  error: '#D24236',   // 4.34:1 on background
  errorLight: '#FDE6E3',
  successLight: '#E4F6E8',
  successText: '#1F6B3C',
  successBorder: '#AFE0BF',
  warningLight: '#FFF1DA',
  warningText: '#7A4E06',
  warningBorder: '#F5D9A8',
  errorText: '#A8322B',
  errorBorder: '#F3BDB6',
  // ─── Overlay ────────────────────────────────────────────────────────────
  overlay: 'rgba(43, 31, 36, 0.55)',
} as const;

// ─── Typography ───────────────────────────────────────────────────────────────
// Single source of truth for the type scale.
//
// `typography.styles` used to hardcode its own numbers in parallel with
// `typography.sizes` — two scales holding the same values with nothing keeping
// them in sync. Changing one without the other leaves half the app at the old
// size, which is exactly the trap the 2026-09-16 pass walked into. Both now
// read from here, so the scale can only be changed in one place.
const fontSizes = {
  xs: 11,
  sm: 12,
  md: 14,
  body: 15,
  lg: 17,
  xl: 20,
  xxl: 25,
  display: 31,
} as const;

export const typography = {
  fonts: {
    // Fredoka (rounded display face) carries the kawaii personality and is
    // reserved for titles/headers. UI labels & body run on Nunito Sans, a
    // humanist sans that keeps long-form copy readable. Named weight files:
    // `fontWeight` in styles is cosmetic only.
    display: 'Fredoka_700Bold',
    ui: 'NunitoSans_600SemiBold',
    body: 'NunitoSans_400Regular',
    bodyBold: 'NunitoSans_700Bold',
  },
  // Scale bumped one step across the board. The audit found `sm`(13) used 121×
  // and `xs`(11) 57× against `display`(36) exactly ONCE — the app had no
  // hierarchy, it just whispered everywhere. Raising the scale here lifts all
  // ~340 token call sites at once.
  // Brought back down 2026-09-16 (was xs 12 / sm 14 / md 16 / body 17 / lg 20 /
  // xl 24 / xxl 30 / display 38). The bump above was the right call when the app
  // "whispered everywhere", but it overshot: paired with generous spacing it made
  // every component read as oversized, and it is the reason tightening padding
  // and radius alone never felt like enough — the boxes shrank while the text
  // inside them stayed inflated. `body` stays at 15, comfortably above the ~14
  // floor for reading copy, and nothing drops below 11.
  sizes: fontSizes,
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
  // Ready-made text roles. Prefer these over assembling size+weight+spacing by
  // hand — negative tracking on large type is what separates "designed" from
  // "default", and it is the thing most often forgotten at the call site.
  // Derived from `fontSizes` — these no longer carry their own numbers, so the
  // scale cannot drift between `sizes` and `styles`. Line heights stay explicit
  // (they are not a fixed ratio of size) and the negative tracking on large type
  // is what separates "designed" from "default".
  styles: {
    display:  { fontSize: fontSizes.display, lineHeight: 35, letterSpacing: -0.9 },
    title:    { fontSize: fontSizes.xxl,     lineHeight: 30, letterSpacing: -0.6 },
    heading:  { fontSize: fontSizes.xl,      lineHeight: 25, letterSpacing: -0.3 },
    subtitle: { fontSize: fontSizes.lg,      lineHeight: 22, letterSpacing: -0.2 },
    headline: { fontSize: fontSizes.body,    lineHeight: 20, letterSpacing: -0.1 },
    body:     { fontSize: fontSizes.body,    lineHeight: 22, letterSpacing: 0 },
    callout:  { fontSize: fontSizes.md,      lineHeight: 20, letterSpacing: 0 },
    caption:  { fontSize: fontSizes.sm,      lineHeight: 17, letterSpacing: 0 },
    label:    { fontSize: fontSizes.xs,      lineHeight: 14, letterSpacing: 0.7 },
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
  // Named aliases for common use.
  //
  // Tightened 2026-09-16. The numeric keys above are a literal 4pt grid and are
  // NOT touched — `spacing[4]` must stay 16 or the name lies. The aliases are
  // where almost all real padding and gaps come from, so they carry the change.
  //
  // The old values were pitched for an airy, spacious layout; on a device that
  // read as components eating the screen, worst on Insights where a streak card,
  // two stat tiles and a chart could not share a viewport. Card defaults to
  // `padding="md"`, so md alone tightens every card in the app.
  xs: 4,
  sm: 6,   // was 8
  md: 12,  // was 16 — default Card padding
  lg: 16,  // was 20
  xl: 20,  // was 28
  xxl: 28, // was 40
  screenPadding: 14, // was 18
} as const;

// ─── Border Radius ────────────────────────────────────────────────────────────
// Rebuilt for 2026. The old scale was both too tight (card 12 / md 6 / lg 8) and
// self-contradictory — `lg` (8) was SMALLER than `card` (12), which guaranteed
// inconsistency at the call site and explains the 150 hardcoded borderRadius
// values found in the audit. This scale is monotonic, so `lg > md > sm` always
// holds, and it is pitched for a soft kawaii product rather than a Material-1 one.
// ─── Sharpened 2026-09-16 ─────────────────────────────────────────────────────
// The scale above these values (sm 8 / md 12 / lg 16 / xl 20 / xxl 28) was set
// during the kawaii redesign, when the brief was "soft". Seen on a device the
// whole app read as pillowy: 20dp cards and 28dp heroes meant almost nothing had
// a corner, and the roundness — not the palette — was doing most of the talking.
//
// Roughly halved. Still monotonic (lg > md > sm always holds), and nothing drops
// to 0, so surfaces stay friendly rather than Material-1 sharp. ~153 token call
// sites across 39 files move with this; the remaining hardcoded numeric radii
// are swept separately.
//
// `full`/`bubble` are deliberately untouched: those are pills and circles by
// intent — mood bubbles, the streak chip, time-of-day badges — not corners.
export const radius = {
  none: 0,
  // Second sharpening pass — halved once from 8/12/16/20/28, now stepped down
  // again. This is close to the floor: below these, surfaces stop reading as
  // rounded at all and the product loses the last of its softness.
  sm: 3,    // was 4  (orig 8)  — chips, checkboxes, tiny inline tags
  md: 4,    // was 6  (orig 12) — inputs, small tiles, list rows
  lg: 6,    // was 8  (orig 16) — standard interactive surfaces
  xl: 8,    // was 10 (orig 20) — cards
  xxl: 10,  // was 14 (orig 28) — heroes, sheets, feature panels
  full: 9999,
  // Specific UI patterns
  button: 8, // was 16
  card: 10,  // was 20
  bubble: 9999,
  // Text badges and chips — "Night", "0/2", "MONTHLY SNAPSHOT", "Pro", the
  // streak chip. These were full pills, which stood out once the surfaces
  // around them were sharpened: the roundness read as leftover rather than
  // intentional. `full` is kept for shapes that are genuinely circular —
  // mood bubbles, legend dots, avatars, progress dots, switch tracks — so the
  // brand's round forms survive while its *corners* do not.
  badge: 6,
} as const;

// ─── Motion ───────────────────────────────────────────────────────────────────
// Spring presets feed react-native-reanimated's `withSpring(value, preset)`.
// Timing values are in ms — use for `withTiming` / fade durations.
// Scale values are press-state targets for SpringPressable.
//
// Kawaii-forward tuning: presses go a little deeper and springs carry a little
// more bounce than a "calm" app would use. `playful` and `celebrate` exist for
// moments of reward (mood logged, habit completed, streak milestone) — do NOT
// reach for them on ordinary navigation, or the whole app reads as jittery.
// Every consumer must gate on useReducedMotion().
export const motion = {
  spring: {
    gentle: { damping: 18, stiffness: 120 },
    snappy: { damping: 14, stiffness: 180 },
    bouncy: { damping: 10, stiffness: 220 },
    playful: { damping: 9, stiffness: 260 },
    celebrate: { damping: 7, stiffness: 200 },
  },
  timing: {
    fast: 180,
    medium: 280,
    slow: 420,
  },
  scale: {
    pressed: 0.94,
    pressedSmall: 0.92,
    // Overshoot target for reward moments — withSequence(pop → 1).
    pop: 1.06,
  },
  // Cascade delay when mounting a collection. 60–110ms is the readable band.
  stagger: 70,
  // Dense variant for grids of ~12+ cells (the 18-mood picker). At the full
  // 70ms step the last cell of that grid would land 1.2s after the first, which
  // stops reading as a cascade and starts reading as a slow screen. A shorter
  // step keeps it a single sweep across the grid.
  staggerDense: 28,
} as const;

// ─── Elevation ────────────────────────────────────────────────────────────────
// Prefer `elevation(tier, isDark)` over the `shadows` object below.
//
// Two reasons it is a function. (1) Shadows are nearly invisible on a dark
// background, so dark mode needs its opacities multiplied up — a static object
// cannot know the theme. (2) It takes a tier number, which makes an elevation
// HIERARCHY expressible: the audit found `Card` defaulting to the heavy `md`
// tier, so every card floated equally and nothing read as more important.
//
// Tier guide:  0 flat (use a border instead) · 1 resting card · 2 raised /
// interactive · 3 floating chrome (tab bar, sheets).
export function elevation(tier: 0 | 1 | 2 | 3, isDark = false) {
  const offsets = [0, 3, 8, 14];
  const radiuses = [0, 10, 18, 28];
  const opacities = [0, 0.055, 0.09, 0.13];
  const mult = isDark ? 1.9 : 1;
  return {
    // Warm-tinted rather than pure black — a neutral #000 shadow over a blush
    // background turns grey and dirties the whole surface.
    shadowColor: isDark ? '#000000' : '#5C2A3A',
    shadowOffset: { width: 0, height: offsets[tier]! },
    shadowOpacity: opacities[tier]! * mult,
    shadowRadius: radiuses[tier]!,
    elevation: tier * 3,
  };
}

// ─── Shadows (cross-platform) ─────────────────────────────────────────────────
// DEPRECATED — kept so the ~29 existing `shadows.*` call sites keep compiling
// while the Phase 2 surface sweep migrates them. New code uses elevation().
// Values are the light-mode output of elevation() at the matching tier.
export const shadows = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  sm: {
    shadowColor: '#5C2A3A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.055,
    shadowRadius: 10,
    elevation: 3,
  },
  md: {
    shadowColor: '#5C2A3A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.09,
    shadowRadius: 18,
    elevation: 6,
  },
  lg: {
    shadowColor: '#5C2A3A',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.13,
    shadowRadius: 28,
    elevation: 9,
  },
} as const;

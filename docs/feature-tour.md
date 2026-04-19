# Feature Tour

In-app walkthrough that runs once after onboarding. Dims the screen, spotlights a UI element, and shows a tooltip. Tapping the backdrop or the Next button advances to the next step.

## Library

Custom in-house implementation at `src/spotlight/`, imported via the `@spotlight` path alias. Built on `react-native-svg` (mask-based cutout) and `react-native-reanimated` (smooth transitions between steps). Renders via a full-screen `Modal` so the overlay is independent of the view hierarchy and can't z-conflict with other absolute layers.

The module has zero imports from the rest of `src/` — it's designed to be lifted out into a standalone npm package (`@kibun/spotlight-tour` or similar) by moving the folder and adding a `package.json` with peer deps.

## Current Steps

| # | Element | Shape | Tooltip text |
|---|---------|-------|-------------|
| 0 | Log mood CTA button | Rectangle | "You're all set! Tap here to log your mood — it only takes a few seconds." |
| 1 | History tab icon | Circle | "See all your past moods here, day by day." |
| 2 | Insights tab icon | Circle | "Discover patterns in your emotions over time." |
| 3 | Shiba mascot (tab bar center) | Rectangle | "This little Shiba lives in your tab bar. Tap them any time to check in…" |

## Files

| File | What it does |
|------|-------------|
| `src/spotlight/*` | The tour package — `TourProvider`, `AttachStep`, `useSpotlightTour`, SVG spotlight, tooltip positioner |
| `src/store/tourStore.ts` | Persisted Zustand store — tracks `hasSeenTour`, exposes `markTourSeen()` and `resetTour()` |
| `src/constants/tourSteps.ts` | `KIBUN_TOUR_STEPS` array — one entry per step |
| `src/components/TourTooltip.tsx` | Kawaii tooltip card — progress dots, Skip + Next buttons |
| `src/hooks/useTourAutoStart.ts` | Fires `start()` on first Home visit after onboarding |
| `app/(tabs)/_layout.tsx` | `SpotlightTourProvider` wraps `<Tabs>` |
| `app/(tabs)/index.tsx` | `AttachStep index={0}` on the CTA, calls `useTourAutoStart()` |
| `src/components/KawaiiTabBar.tsx` | `AttachStep index={1,2,3}` on tabs + mascot |
| `app/(tabs)/settings.tsx` | "Feature tour" row to replay |

## Public API

```ts
import { SpotlightTourProvider, AttachStep, useSpotlightTour } from '@spotlight';
import type { TourStep, RenderProps } from '@spotlight';
```

- `<SpotlightTourProvider steps onBackdropPress onStart onStop overlayColor motion>` — wrap the screen subtree
- `<AttachStep index={n} style={...}>` — wrap the target element
- `useSpotlightTour()` → `{ start, stop, next, previous, goTo, invalidate, current, isRunning }`

Each step's `render(props)` receives `{ current, total, next, previous, stop, isFirst, isLast }`.

## Resilience (layout-shift handling)

The provider actively remeasures the active step on:
- Step change
- `AttachStep` remount or local `onLayout` event (debounced 50ms)
- `Dimensions.change` (rotation, fold)
- Keyboard show/hide
- Manual `invalidate()` via the hook

This replaces the previous `remeasureTick` + dynamic `key` workaround. You shouldn't need to manually force a remount to get the spotlight to track layout changes — the provider handles it.

## Adding a new step

1. Add an entry to `KIBUN_TOUR_STEPS` in `src/constants/tourSteps.ts` and bump the `TOTAL_STEPS` constant used by the tooltip
2. Wrap the target element: `<AttachStep index={N}>…</AttachStep>` inside the `SpotlightTourProvider` subtree
3. `style` on `AttachStep` is optional — the wrapper defaults to `alignSelf: 'auto'` so the child's natural layout is preserved

## Testing mode

To force the tour to show on every launch, set `FORCE_TOUR_ON = true` in `src/hooks/useTourAutoStart.ts`. Flip back to `false` before shipping.

## Extracting to a standalone package (future)

Because `src/spotlight/` imports nothing from the rest of the app:
1. Move the folder into its own repo
2. Add `package.json` declaring peer deps: `react`, `react-native`, `react-native-svg`, `react-native-reanimated`
3. Publish; update the `@spotlight` alias in the app to point at the package name

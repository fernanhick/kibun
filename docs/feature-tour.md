# Feature Tour

In-app walkthrough that runs once after onboarding. Dims the screen, spotlights a UI element, and shows a tooltip. Tapping the backdrop or the Next button advances to the next step.

## Library

`react-native-spotlight-tour` v4 — no extra native deps needed, `react-native-svg` and `react-native-reanimated` were already in the project. The overlay renders as a full-screen Modal so it's independent of the view hierarchy.

## Current Steps

| # | Element | Shape | Tooltip text |
|---|---------|-------|-------------|
| 0 | Log mood CTA button | Rectangle | "Tap here to log your first mood — it only takes a few seconds!" |
| 1 | History tab icon | Circle | "See all your past moods here, day by day." |
| 2 | Insights tab icon | Circle | "Discover patterns in your emotions over time." |

## Files

| File | What it does |
|------|-------------|
| `src/store/tourStore.ts` | Persisted Zustand store — tracks `hasSeenTour`, exposes `markTourSeen()` and `resetTour()` |
| `src/constants/tourSteps.ts` | `KIBUN_TOUR_STEPS` array — one entry per step with `render`, `shape`, `placement` |
| `src/components/TourTooltip.tsx` | The tooltip card rendered on each step — kawaii-styled, progress dots, Skip + Next buttons |
| `src/hooks/useTourAutoStart.ts` | Called from HomeScreen — fires `start()` once on first visit after onboarding |
| `app/(tabs)/_layout.tsx` | `SpotlightTourProvider` wraps `<Tabs>` here |
| `app/(tabs)/index.tsx` | `AttachStep index={0}` on the CTA section, calls `useTourAutoStart()` |
| `src/components/KawaiiTabBar.tsx` | `AttachStep index={1}` on History tab, `AttachStep index={2}` on Insights tab |
| `app/(tabs)/settings.tsx` | "APP TOUR" section with a "Feature tour" row to replay |

## Why the provider is in `(tabs)/_layout.tsx` and not root

The root layout renders `PersistentMascotOverlay` as an absolute sibling to `<Stack>`. Putting the provider at root would z-conflict with the mascot. At the tab level the SVG overlay sits below the mascot in the global stack — no conflict.

## Adding a new step

1. In `src/constants/tourSteps.ts`, add an entry to `KIBUN_TOUR_STEPS` and bump `TOTAL_STEPS`
2. Wrap the target element with `<AttachStep index={N} style={...}>` in the right screen/component
3. The element must be inside the `(tabs)` group (i.e. within `SpotlightTourProvider`)
4. Always include the `style` fix described below

## AttachStep layout rule — read this before wrapping anything

`AttachStep` always injects a wrapper `View` around its child. That wrapper defaults to `alignSelf: "flex-start"`, which overrides the parent's `alignItems` and shifts the element out of position — the spotlight then measures and highlights the wrong spot.

Fix it by passing the right `style` based on the parent's flex direction:

```tsx
// Parent is a column (default) and child should fill full width
<AttachStep index={0} style={{ alignSelf: 'stretch' }}>

// Parent is a row with alignItems: 'center' (e.g. tab bar)
<AttachStep index={1} style={{ alignSelf: 'center' }}>
```

## Testing mode

To force the tour to show on every launch (useful during development):

In `src/hooks/useTourAutoStart.ts`, set `const FORCE_TOUR_ON = true`.

**To revert when done testing:**
- Delete the `const FORCE_TOUR_ON = true` line
- Remove the `resetTour` selector and its usage
- Restore `if (hasSeenTour) return;` in the effect

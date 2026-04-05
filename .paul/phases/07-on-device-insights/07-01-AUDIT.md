# Enterprise Plan Audit Report

**Plan:** .paul/phases/07-on-device-insights/07-01-PLAN.md
**Audited:** 2026-04-05
**Verdict:** Conditionally Acceptable -> Ready (after applying findings)

---

## 1. Executive Verdict

**Conditionally Acceptable.** The plan is well-structured with clear acceptance criteria, appropriate boundaries, and correct use of established patterns (pure utilities, stable-selector). Four findings required remediation: one must-have (timezone-sensitive date filtering) and three strongly-recommended (chart sizing, label density, TS type safety). After applying all four, the plan is ready for APPLY.

I would approve this plan for production after the applied changes.

## 2. What Is Solid

- **Pure utility design** — `insights.ts` as stateless functions accepting entries as parameters mirrors the established `notifications.ts` pattern. Correct for testability, reuse in Plan 07-02 pattern detection, and separation of concerns.
- **Stable-selector pattern** — Plan explicitly prescribes `useMoodEntryStore((s) => s.entries)` with `useMemo` derivation. Consistent with Phase 5 decision that prevents infinite re-render loops from `.filter()` in selectors.
- **Boundaries are comprehensive** — All stable files explicitly protected. Scope limits prevent creep into pattern detection (07-02), Supabase queries, and subscription gating.
- **Empty state coverage** — AC-5 handles zero-entry case, preventing chart library crashes on empty data arrays.
- **Library choice is justified** — react-native-gifted-charts uses react-native-svg (standard Expo dep) instead of Victory Native v41+ (Skia dependency). Lower dependency footprint for the simple charts needed.
- **GROUP_SCORES mapping is explicit** — Numeric mood scoring (green=4 to red-orange=1) is defined as a constant, not scattered through code. Plan 07-02 can reuse it directly.

## 3. Enterprise Gaps Identified

1. **Timezone-dependent date boundary in filterEntriesByDays** — Plan specified "set to start of day (00:00:00)" which implies `setHours(0,0,0,0)`. This sets LOCAL midnight, but `loggedAt` is stored via `toISOString()` (UTC). Converting local midnight to ISO shifts the cutoff by timezone offset, silently including/excluding entries near day boundaries. In UTC-8, a user who logs at 11pm local (07:00 UTC next day) would see their entry assigned to the wrong day in the filter.

2. **Chart overflow/underflow without explicit width** — BarChart and LineChart render at intrinsic content width. Without an explicit `width` prop computed from screen dimensions, charts may overflow on narrow screens or leave dead space on wide screens. This produces visual artifacts specific to device class.

3. **LineChart label density at 30 data points** — 30 date labels at fontSize 9 on a ~280pt wide chart means ~9pt per label slot. Text overlaps, rendering labels unreadable. Chart appears cluttered and inaccessible.

4. **react-native-gifted-charts TypeScript types** — Library has had incomplete/missing TS declarations in some releases. If types don't resolve, `npx tsc --noEmit` fails, blocking AC-6 with an error unrelated to project code quality.

## 4. Upgrades Applied to Plan

### Must-Have (Release-Blocking)

| # | Finding | Plan Section Modified | Change Applied |
|---|---------|----------------------|----------------|
| 1 | filterEntriesByDays timezone inconsistency — local midnight via setHours creates UTC offset drift | Task 1 action, filterEntriesByDays specification | Changed to UTC-consistent approach: `cutoff.toISOString()` without setHours(0,0,0,0). Added explicit warning against local midnight. Added verification check. |

### Strongly Recommended

| # | Finding | Plan Section Modified | Change Applied |
|---|---------|----------------------|----------------|
| 1 | Chart container width not computed from screen dimensions | Task 2 action, imports, data derivation | Added `useWindowDimensions` import, `chartWidth` computation, `width={chartWidth}` on both BarChart and LineChart. |
| 2 | LineChart 30-day label density unreadable | Task 2 action, mood trend section | Added label abbreviation: show label every 5th day for 30-day period, all labels for 7-day. |
| 3 | react-native-gifted-charts TS types may not resolve | Task 1 action, files_modified frontmatter | Added step 3 to Task 1: verify types resolve after install, create `declare module` fallback if needed. Added `src/types/react-native-gifted-charts.d.ts` to files_modified (conditional). |

### Deferred (Can Safely Defer)

| # | Finding | Rationale for Deferral |
|---|---------|----------------------|
| 1 | Charts with 1-2 data points look sparse | Charts render correctly, just visually minimal. No crash risk. Improving this requires min-data-points logic that adds complexity without user value at MVP. |
| 2 | Bar label truncation for long mood names ("Frustrated" at 10px) | Labels may overlap at edges but are still partially readable. Full fix requires label rotation or abbreviated names — visual polish, not functionality. |
| 3 | Period toggle semantic role (radiogroup vs button) | `accessibilityRole="button"` with `accessibilityState={{ selected }}` is an acceptable pattern in React Native. True radiogroup support is limited in RN's accessibility API. |

## 5. Audit & Compliance Readiness

- **Defensible audit evidence:** Plan produces visible, verifiable output (charts render or don't). TypeScript check provides compile-time evidence. Empty state AC prevents silent failure.
- **Silent failure prevention:** Timezone fix (must-have #1) prevents the most dangerous silent failure — data appearing correct but filtered to the wrong day boundary. Defensive MOOD_MAP lookups prevent crash on unknown moodId.
- **Post-incident reconstruction:** Pure utility functions are testable in isolation. Chart rendering issues can be diagnosed by inspecting utility output (frequency array, daily scores array) independently.
- **Ownership:** InsightsScreen is a single file with clearly scoped responsibility. insights.ts utilities are stateless and composable.

## 6. Final Release Bar

**What must be true:**
- filterEntriesByDays uses UTC-consistent comparison (no local midnight)
- Charts render at correct width on all screen sizes
- 30-day LineChart labels are readable (abbreviated)
- TypeScript compilation passes with gifted-charts types (or fallback exists)

**Risks if shipped as-is (pre-audit):**
- Users in western timezones (UTC-5 to UTC-8) would see entries near midnight assigned to wrong day in insights, creating distrust in the data.
- Charts could overflow on iPhone SE or narrow Android screens.

**Sign-off:** With the four applied upgrades, I would approve this for production. The remaining deferred items are visual polish, not correctness issues.

---

**Summary:** Applied 1 must-have + 3 strongly-recommended upgrades. Deferred 3 items.
**Plan status:** Updated and ready for APPLY

---
*Audit performed by PAUL Enterprise Audit Workflow*
*Audit template version: 1.0*

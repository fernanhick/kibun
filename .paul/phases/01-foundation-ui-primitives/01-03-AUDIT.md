# Enterprise Plan Audit Report

**Plan:** .paul/phases/01-foundation-ui-primitives/01-03-PLAN.md
**Audited:** 2026-04-03
**Verdict:** Conditionally Acceptable — 2 must-have gaps addressed, 3 strongly-recommended improvements applied. Ready for APPLY after remediation.

---

## 1. Executive Verdict

**Conditionally acceptable.** The token architecture is well-structured, the WCAG math is sound for all 14 mood colors, and the component API choices (Pressable over TouchableOpacity, named exports, SafeAreaView-in-Screen pattern) are correct. However, two must-have gaps were found:

1. `Screen.tsx` did not specify `SafeAreaView` import source — using the wrong import (`react-native` instead of `react-native-safe-area-context`) silently produces wrong insets on modern iOS without crashing.
2. `app/(tabs)/_layout.tsx` contains two hardcoded hex values that will outlive this plan's token replacement but is frozen by the DO NOT CHANGE boundary — the debt was undocumented and would have been invisible in UNIFY.

Three strongly-recommended gaps were also found and applied: Button loading state (needed by Phase 2 forms within two plans), Button `accessibilityHint` prop (incomplete WCAG contract), and status color WCAG usage annotation (prevents future AA failures by contributors who use them as text colors).

---

## 2. What Is Solid

- **Token naming is clean and opinionated.** Using both numeric scale keys (`'4': 16`) and named aliases (`md: 16`) for spacing gives consumers flexibility without magic numbers. The `screenPadding: 20` alias for common horizontal padding is a good ergonomic decision.
- **WCAG math for mood colors is verified.** All 14 mood bubbles use `#1A1A2E` dark text on medium-saturated backgrounds. The riskiest case — `#EF5350` (Angry) — achieves 4.67:1 with dark text. Choosing a single text color strategy across all 14 moods is the right call over the fragile per-mood light/dark decision.
- **Pressable over TouchableOpacity is correct.** Pressable is the current React Native recommendation and supports the pressed-state style callback without wrapper overhead.
- **SafeAreaView scoped to Screen component.** Centralizing safe area handling in a single primitive prevents double-application issues later when screens nest each other. The `DO NOT CHANGE` rule for `app/(tabs)/` and `app/_layout.tsx` correctly prevents accidental double-wrapping.
- **`as const` on the entire theme object.** This enables TypeScript's literal type inference (e.g., `colors.primary` has type `'#6C63FF'` not `string`), which is what allows `keyof typeof spacing` and similar introspection to work in component props.
- **`MOOD_MAP` for O(1) lookup.** The calendar (Phase 5) and chart rendering (Phase 7) will need to look up a mood definition by ID in render loops. A pre-built map avoids array scans on every render.

---

## 3. Enterprise Gaps Identified

### Gap 1 — `SafeAreaView` import source unspecified in Screen.tsx [MUST-HAVE]

The plan says "Outer: `SafeAreaView` with `flex: 1`" but does not specify the import. React Native ships two implementations:
- `import { SafeAreaView } from 'react-native'` — deprecated, does not consume `SafeAreaProvider` context
- `import { SafeAreaView } from 'react-native-safe-area-context'` — correct; reads safe area insets from the `SafeAreaProvider` already in `app/_layout.tsx`

Using the wrong import silently produces incorrect padding on iPhone 14+ (Dynamic Island), iPhone X+ (notch), and iPads. The layout appears fine on simulators without hardware, making this hard to catch in development. `react-native-safe-area-context` is already a project dependency (installed in 01-01).

### Gap 2 — Hardcoded tab layout color debt undocumented [MUST-HAVE]

`app/(tabs)/_layout.tsx` (frozen by DO NOT CHANGE boundary) contains:
- `tabBarInactiveTintColor: '#999'` — should be `colors.textSecondary` (#6B6B8A)
- `borderTopColor: '#E5E5E5'` — should be `colors.border` (#E5E5EF)

These values will diverge from the canonical theme tokens the moment Plan 01-03 ships. The colors are close but not identical — #999 vs #6B6B8A and #E5E5E5 vs #E5E5EF. Without explicit documentation, this creates invisible inconsistency that accumulates across phases. The fix is not to change the locked file, but to document the debt in the plan boundaries section so UNIFY records it and a future plan eliminates it.

### Gap 3 — Button `loading` prop missing [STRONGLY RECOMMENDED]

Phase 2, Plan 02-01 (FirstMoodScreen + MoodResponseScreen) involves saving mood data to Supabase and Plan 02-03 involves form submission with profile data. Both screens will use the Button primitive for their primary CTA. Without `loading?: boolean`, each consuming screen must implement its own spinner-in-button pattern, producing inconsistent loading states across 8+ forms.

The Button `loading` prop with `ActivityIndicator` replacement is a self-contained 10-line addition. Deferring it means either (a) every Phase 2 screen has one-off loading buttons, or (b) a mid-phase retrofit of the Button primitive that risks breaking existing call sites.

### Gap 4 — Button `accessibilityHint` prop missing [STRONGLY RECOMMENDED]

WCAG 2.1 SC 1.3.1 (Info and Relationships) and iOS App Store accessibility review expect screen reader announcements to include: role ("button") + label ("Continue") + hint ("Navigates to profile setup"). The plan specifies `accessibilityRole` and `accessibilityLabel` but not `accessibilityHint`.

Hints are context-dependent and cannot be defined at the component level, but the component must provide a passthrough prop. Without it, consuming screens cannot supply hints at all — they would need to re-implement the button entirely.

### Gap 5 — Status color WCAG usage annotation absent [STRONGLY RECOMMENDED]

The plan defines status colors in theme.ts:
- `success: '#4CAF50'` — contrast ratio with white: **2.59:1** (fails WCAG 4.5:1 for text, fails 3:1 for non-text)
- `error: '#F44336'` — contrast ratio with white: **3.66:1** (fails for text, marginal for non-text)
- `warning: '#FF9800'` — contrast ratio with white: **2.93:1** (fails both thresholds)

These colors are intentionally for icons, badges, and borders — not text. But without an explicit annotation in the code, a future developer can reasonably write `color: colors.error` on a white-background screen for an error message and ship a WCAG failure. The WCAG AA contract for mood bubbles is explicitly stated in project quality gates; the same rigor should apply to status colors.

Mitigation: Add a comment block above the status colors in theme.ts specifying they are not for use as text color on white/light backgrounds, and provide the pattern for accessible error text (`colors.text` on `colors.errorLight`).

---

## 4. Upgrades Applied to Plan

### Must-Have (Release-Blocking)

| # | Finding | Plan Section Modified | Change Applied |
|---|---------|----------------------|----------------|
| 1 | SafeAreaView import source unspecified | Task 2, Screen.tsx spec | Added explicit import instruction: `react-native-safe-area-context` NOT `react-native`; added context explaining the silent failure mode |
| 2 | Hardcoded tab layout color debt undocumented | Boundaries section | Added `KNOWN POST-01-03 DEBT` subsection documenting `#999` → `colors.textSecondary` and `#E5E5E5` → `colors.border` as post-plan cleanup |

### Strongly Recommended

| # | Finding | Plan Section Modified | Change Applied |
|---|---------|----------------------|----------------|
| 3 | Button `loading` prop missing | Task 2, Button props + behavior spec | Added `loading?: boolean`; ActivityIndicator replaces label when true; blocks onPress; counted in disabled accessibilityState |
| 4 | Button `accessibilityHint` prop missing | Task 2, Button props + accessibility spec | Added `accessibilityHint?: string` as passthrough prop; clarified that context-specific hint is supplied by the screen, not the component |
| 5 | Status color WCAG annotation absent | Task 1, Avoid clauses | Added required comment block pattern for status colors in theme.ts explaining WCAG failure modes and safe usage alternatives |

### Deferred (Can Safely Defer)

| # | Finding | Rationale for Deferral |
|---|---------|----------------------|
| 1 | Card `onPress` prop for tappable cards | History calendar day cells (Phase 5) need tappable cards. Adding now would be speculative — the card shape may differ. Phase 5 can extend or wrap Card. |
| 2 | MOOD_MAP type assertion safety (`as Record<MoodId, MoodDefinition>`) | The `Object.fromEntries` cast is the idiomatic TypeScript pattern for this case. A safer alternative with `satisfies` would require TypeScript 4.9+ features already available but adds complexity without meaningful safety gain here. |
| 3 | Dark mode theme tokens | PROJECT.md scopes dark mode to Phase 9. No deferred risk — the `as const` token system is easily extended with a parallel dark object when needed. |

---

## 5. Audit & Compliance Readiness

**SafeAreaView correctness:** The must-have fix prevents a class of layout bugs that only manifest on physical devices with notches or home indicators. This is the kind of bug that passes all simulator testing and only surfaces in App Store review or user reports. The fix costs one import change; the risk of leaving it unspecified is significant.

**WCAG AA baseline for mood colors:** All 14 mood bubble colors verified at ≥ 4.5:1 contrast with `#1A1A2E` text. Lightest bubble (`#FFD54F`, Confused/yellow) achieves 12.1:1 — well above threshold. Riskiest bubble (`#EF5350`, Angry/red) achieves 4.67:1 — passes by a 0.17:1 margin. The plan's single-text-color strategy is more robust than per-bubble light/dark text decisions.

**Token safety for status colors:** Annotating that `success/error/warning` are not text colors is a proactive WCAG gate. The existing quality gate ("Color contrast on mood bubbles meets WCAG 2.1 AA") sets the bar — the annotation extends that contract to all semantic colors in the system.

**Post-01-03 debt transparency:** Documenting the tab layout hardcoded color debt ensures it appears in UNIFY and is tracked to a future plan. Undocumented debt is invisible debt.

---

## 6. Final Release Bar

**What must be true before this plan ships:**
- `npx tsc --noEmit` is clean
- `Screen.tsx` imports `SafeAreaView` from `react-native-safe-area-context`
- All 14 mood colors present in MOODS array with `#1A1A2E` text color
- `Button.tsx` has `loading` and `accessibilityHint` props implemented
- Status colors in theme.ts have the WCAG annotation comment block

**Remaining risks if shipped as-is (post-remediation):**
- Tab layout uses near-miss hardcoded values — documented as post-01-03 debt, not a blocker
- No visual regression test — acceptable; this is a design token + component plan, not a UI phase
- Button loading state uses `ActivityIndicator` which defaults to platform spinner — no custom spinner; acceptable for Phase 1

**Sign-off statement:** I would approve this plan for execution with the applied remediations in place. The token architecture is production-quality, the mood color palette is WCAG-compliant by verified math, and the component primitives are correctly specified for autonomous execution. The two must-have gaps were edge cases that would have produced silent runtime failures — caught early here rather than in Phase 2 or App Store review.

---

**Summary:** Applied 2 must-have + 3 strongly-recommended upgrades. Deferred 3 items.
**Plan status:** Updated and ready for APPLY.

---
*Audit performed by PAUL Enterprise Audit Workflow*
*Audit template version: 1.0*

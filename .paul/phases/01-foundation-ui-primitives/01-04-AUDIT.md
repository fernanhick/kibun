# Enterprise Plan Audit Report

**Plan:** .paul/phases/01-foundation-ui-primitives/01-04-PLAN.md
**Audited:** 2026-04-03
**Verdict:** Conditionally Acceptable — 2 must-have gaps addressed, 2 strongly-recommended improvements applied. Ready for APPLY after remediation.

---

## 1. Executive Verdict

**Conditionally acceptable.** The component architecture is correct: controlled selection (no internal state), right animation library choice (Animated from react-native, not Reanimated), proper shadow token usage (confirmed working from Card.tsx in 01-03), and well-scoped task separation. Two must-have gaps were found in the animation spec that would produce runtime issues in any animated navigation flow:

1. `useEffect` dependency array not specified — ambiguous for autonomous execution; wrong array causes animation to never fire or fire on every render.
2. Animation cleanup on unmount not specified — `Animated.spring` fires against unmounted component when user navigates away mid-animation (common in onboarding).

Two strongly-recommended gaps were also applied: `hitSlop` for generous touch targets (WCAG 2.5.5) and conditional `accessibilityRole` (semantically incorrect role="button" on non-interactive display variant).

---

## 2. What Is Solid

- **Controlled component pattern is correct.** `selected` is a prop, never internal state. This is the right design for a grid where 14 bubbles need coordinated single-selection — the screen owns the selection logic, MoodBubble just renders.
- **`Animated` (react-native) over Reanimated is the right call.** Reanimated isn't installed yet; forcing it here would add an install step and native rebuild requirement. Plan 01-05 brings Reanimated for Lottie; at that point a future plan can upgrade MoodBubble if the worklet performance matters. For a simple scale spring, `Animated` is sufficient.
- **Shadow spread pattern confirmed working.** Card.tsx in 01-03 already uses `...shadows.sm` in `StyleSheet.create` and compiled clean. MoodBubble's shadow usage follows the same established pattern.
- **`wrapper: alignSelf: 'flex-start'`** is the correct fix for `Animated.View` stretch in flex parents — a well-known React Native layout issue. It's explicitly specified here.
- **`useNativeDriver: true` mandated.** Scale transforms run entirely on the native thread, never touching the JS bridge. This ensures the animation doesn't drop frames during JS-heavy state updates.
- **Shadow state replacement (not stacking) is correctly designed.** `styles.selected` contains the full `shadows.md` spread which overrides `styles.bubble`'s `shadows.sm` properties via React Native's last-writer-wins style resolution. The comment "do not stack" correctly documents intent.
- **Tab layout debt cleanup is correctly bundled here** — scoped tightly to two line changes, DO NOT CHANGE boundary appropriately limited.

---

## 3. Enterprise Gaps Identified

### Gap 1 — `useEffect` dependency array not specified [MUST-HAVE]

The plan states: "On `selected` change via `useEffect`" but does not write the dependency array. For an `autonomous: true` plan, ambiguity in the hook signature produces two failure modes:

- `useEffect(() => { ... }, [])` — animation fires once on mount, then never again. Selection appears to have no animation after the first tap.
- `useEffect(() => { ... })` (no array) — animation fires after every render. Any `pressed` state change, any parent re-render triggers the scale spring. Creates jitter during tap interactions.

The correct array is `[selected]`. This must be explicit in the plan.

### Gap 2 — Animation cleanup on unmount not specified [MUST-HAVE]

If a user navigates away from a screen (e.g., taps a mood in FirstMoodScreen during onboarding → screen transitions to MoodResponseScreen), any in-flight `Animated.spring` continues executing and attempts to call its completion callback against an unmounted `Animated.Value`. In React Native, this fires:

> Warning: Animated: `setValue` was called on a node after it was removed from the animation tree.

In production, this is a memory leak — the `Animated.Value` node is retained by the running animation. The fix is:

```typescript
return () => animation.stop();
```

This requires storing the animation object returned by `Animated.spring(...)` before calling `.start()`.

### Gap 3 — `hitSlop` not specified on Pressable [STRONGLY RECOMMENDED]

`size="sm"` bubbles are 48×48pt — this exactly meets the WCAG 2.5.5 (Target Size, Level AA) 44pt minimum with zero margin. On small phones or when a user's finger is offset, taps miss the visual target. `hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}` extends the touchable area by 8pt on each side (giving an effective 64×64pt touch area for `sm` bubbles) without affecting visual layout or spacing. This is standard practice for compact touch targets in wellness/mood apps.

### Gap 4 — `accessibilityRole="button"` unconditional on non-interactive variant [STRONGLY RECOMMENDED]

`onPress` is optional in the MoodBubble interface. A bubble without `onPress` is display-only (valid use case for summary views in future phases). `accessibilityRole="button"` on an element with no interaction handler is semantically incorrect per WCAG 4.1.2 (Name, Role, Value) — screen readers announce it as an interactive button, but activating it does nothing. This creates a confusing and non-compliant experience for VoiceOver/TalkBack users.

Fix: `accessibilityRole={onPress ? 'button' : 'text'}`. When display-only, `accessibilityState` should also be `undefined` (no disabled/selected state on a non-interactive element).

---

## 4. Upgrades Applied to Plan

### Must-Have (Release-Blocking)

| # | Finding | Plan Section Modified | Change Applied |
|---|---------|----------------------|----------------|
| 1 | useEffect dependency array unspecified | Task 1, Animation spec | Replaced prose description with explicit code block showing `useEffect(..., [selected])` |
| 2 | Animation cleanup not specified | Task 1, Animation spec | Added `return () => animation.stop()` in useEffect cleanup; added explanatory comment about navigation-during-animation scenario |

### Strongly Recommended

| # | Finding | Plan Section Modified | Change Applied |
|---|---------|----------------------|----------------|
| 3 | hitSlop absent on Pressable | Task 1, Structure spec | Added `hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}` to Pressable; added note explaining effective touch area |
| 4 | accessibilityRole unconditional | Task 1, Structure spec | Changed to `accessibilityRole={onPress ? 'button' : 'text'}`; `accessibilityState` also conditioned on `onPress` |

### Deferred (Can Safely Defer)

| # | Finding | Rationale for Deferral |
|---|---------|----------------------|
| 1 | Android elevation shadow clipping by parent overflow | Bubbles will be in a FlatList or flex grid — these containers don't set `overflow: 'hidden'` by default. Verify on physical Android device in Phase 4 when the grid is built. |
| 2 | Reanimated upgrade for MoodBubble | 01-05 installs Reanimated for Lottie. After 01-05, a follow-up could upgrade the scale animation to a worklet for better performance on low-end devices. Not required for Phase 2 functionality. |
| 3 | `Animated.Value` allocation on every render | `new Animated.Value(1)` is called each render but `useRef` only uses the first call. Negligible for a lightweight object. No action required. |

---

## 5. Audit & Compliance Readiness

**Animation lifecycle correctness:** Both must-have fixes address the same root concern — Animated animations must be lifecycle-aware. The dependency array fix ensures the animation fires at the right time; the cleanup fix ensures it doesn't fire at the wrong time. Together they make the animation production-safe for screens with navigation transitions.

**Touch target compliance:** The `hitSlop` addition brings `sm` bubbles from "barely passing" (48pt = 44pt + 4pt margin) to "comfortably passing" (64pt effective area). For a mental health app where users may be in emotional states affecting fine motor precision, generous touch targets are especially important.

**Accessibility semantic correctness:** The conditional `accessibilityRole` change addresses a WCAG 4.1.2 requirement. The app targets App Store distribution — Apple's accessibility audit for major apps checks for non-interactive elements with interactive roles. The fix prevents a potential rejection or accessibility gap report.

**Shadow spread from `as const` tokens:** Confirmed working. Card.tsx in 01-03 established this pattern; MoodBubble follows identically.

---

## 6. Final Release Bar

**What must be true before this plan ships:**
- `npx tsc --noEmit` is clean
- MoodBubble exports named `MoodBubble` with all 5 props
- `useEffect` has `[selected]` dependency array
- `return () => animation.stop()` in useEffect cleanup
- `accessibilityRole` is conditional on `onPress`
- `hitSlop` present on Pressable
- Tab layout has no hardcoded hex values

**Remaining risks if shipped as-is (post-remediation):**
- Android shadow elevation rendering requires physical device verification — deferred to Phase 4 grid build
- `sm` size not used in any Phase 1 screen — functional validation deferred to first consumer (Phase 2 FirstMoodScreen uses `lg`)

**Sign-off statement:** I would approve this plan for execution with the applied remediations. The component architecture is production-quality: controlled selection, correct animation library choice, proper token usage, full accessibility. The two must-have fixes are lifecycle correctness issues that would have manifested in Phase 2's navigation-heavy onboarding flow — caught here rather than in debugging sessions.

---

**Summary:** Applied 2 must-have + 2 strongly-recommended upgrades. Deferred 3 items.
**Plan status:** Updated and ready for APPLY.

---
*Audit performed by PAUL Enterprise Audit Workflow*
*Audit template version: 1.0*

# Enterprise Plan Audit Report

**Plan:** .paul/phases/01-foundation-ui-primitives/01-05-PLAN.md
**Audited:** 2026-04-03
**Verdict:** Conditionally Acceptable — 2 must-have gaps addressed, 2 strongly-recommended improvements applied. Ready for APPLY after remediation.

---

## 1. Executive Verdict

**Conditionally acceptable.** The dependency selection (lottie-react-native + react-native-reanimated), package manager approach (npx expo install for version compatibility), build config (babel plugin last, config plugin in app.config.ts), and component architecture (variant-based Shiba, SplashScreenView as a pre-auth gate) are all sound. Two must-have gaps were found:

1. **`ANIMATIONS` map `object` type annotation** — explicit `Record<ShibaVariant, object>` would fail TypeScript strict-mode compilation when LottieView's `source` prop resolves to `AnimationObject` (`Record<string, unknown>` in lottie-react-native v7). `object` is not assignable to `Record<string, unknown>` because `object` lacks an index signature. Fix: remove the annotation, let TypeScript infer `any` from the `require()` return type.

2. **SplashScreenView never visible to user** — the plan's `hideAsync` pattern fires when `isReady=true`, which triggers React to immediately re-render to the Stack before the effect runs. Native splash fades revealing Stack, not SplashScreenView. The Shiba animation runs behind the native splash and is never seen, breaking both AC-4 and the plan's core validation goal ("Lottie integration validated"). Fix: `onFinish` callback on SplashScreenView + `splashDone` state in `_layout.tsx` + delay `hideAsync` until both `isReady && splashDone`.

Two strongly-recommended gaps were also applied: accessibility props on a `View` wrapper (not directly on `LottieView` whose props interface may not declare them in strict mode) and corrected install rationale for `react-native-reanimated` (it's a ROADMAP dependency, not a peer dep of `lottie-react-native`).

---

## 2. What Is Solid

- **Lottie package selection is correct.** `lottie-react-native` is the standard Expo-compatible choice for SDK 52. The `npx expo install` approach ensures version pinning compatible with the SDK — correct over specifying a version manually.
- **Config plugin registration in app.config.ts is correctly specified.** `lottie-react-native` requires Expo config plugin registration to link iOS/Android native modules in managed workflow. Same pattern as `expo-secure-store` established in 01-02.
- **Reanimated babel plugin placement is correctly mandated as last.** This is the most common Reanimated setup error. The plan explicitly states the constraint with a rationale (worklet transpilation requires it), not just "put it last."
- **checkpoint:human-action for asset download is the right call.** The Lottie JSON assets must be downloaded from LottieFiles manually — Claude cannot fetch and save them. Using a checkpoint is correct and honest.
- **SplashScreenView outside SafeAreaProvider is correct.** The centered `flex: 1` layout for a pre-auth splash doesn't need safe area insets. The content stack (Shiba 160pt + title + subtitle) is vertically centered on all devices and won't overlap status bars or home indicators.
- **`loop={false}` after the fix is correct.** Playing the animation exactly once and calling `onFinish` is semantically clean. The caller (`_layout.tsx`) controls the lifecycle rather than the animation looping indefinitely.
- **TBD variant deferral is correct.** Anxious/Tired Shiba assets have no confirmed LottieFiles match. Blocking Phase 1 on unconfirmed assets would delay the phase. They're properly deferred as Phase 2 blockers.
- **StyleSheet.absoluteFill for LottieView inside the accessibility wrapper** is the standard pattern for filling a bounded container — correct over duplicating the size values.

---

## 3. Enterprise Gaps Identified

### Gap 1 — `ANIMATIONS: Record<ShibaVariant, object>` type annotation fails in strict mode [MUST-HAVE]

The plan specifies:
```typescript
const ANIMATIONS: Record<ShibaVariant, object> = {
  happy: require('../assets/lottie/shiba-happy.json'),
  ...
};
```

And then:
```tsx
<LottieView source={ANIMATIONS[variant]} ... />
```

In `lottie-react-native` v7, `LottieView.source` is typed as:
```typescript
source: AnimationObject | string | { uri: string };
// where AnimationObject = Record<string, unknown>
```

`Record<string, unknown>` requires an index signature. `object` in TypeScript does **not** have an index signature — it represents "any non-primitive" but without the guarantee that string keys can be indexed. TypeScript strict mode will reject:

```
Type 'object' is not assignable to type 'AnimationObject'.
  Index signature for type 'string' is missing in type 'object'.
```

This directly breaks AC-5 (TypeScript compiles clean).

The fix is to remove the explicit annotation. `require()` returns `any`, and TypeScript infers the ANIMATIONS map as `{ happy: any, excited: any, ... }`. Indexing with `ShibaVariant` (a union of the four literal key types) works in TypeScript 5.x. `any` is assignable to `AnimationObject` without error.

### Gap 2 — SplashScreenView never visible: `hideAsync` fires before animation plays [MUST-HAVE]

The original plan's `_layout.tsx` wiring:
```typescript
useEffect(() => {
  if (isReady) SplashScreen.hideAsync();
}, [isReady]);

if (!isReady) return <SplashScreenView />;
return <SafeAreaProvider>...<Stack>...</SafeAreaProvider>;
```

**Exact failure mode:**

When `isReady` transitions from `false` to `true`:
1. React schedules a re-render
2. **Re-render executes synchronously:** `!isReady` = false → Stack renders (SplashScreenView is gone from the tree)
3. **After the commit, effects run:** `useEffect([isReady])` fires → `SplashScreen.hideAsync()` called

The native splash was still showing during step 2. In step 3, `hideAsync()` starts the fade. The fade reveals the Stack, because that's what is now in the React tree.

Result: SplashScreenView rendered for 0 visible frames. The Shiba animation played 0–N times behind the native splash, but the user never saw it. AC-4 ("Shiba animation briefly visible as native splash fades") cannot pass. More importantly, the plan's core validation goal — "validate end-to-end Lottie rendering before Phase 2 requires it" — is not achieved.

The fix requires two-condition gating:
```typescript
const [splashDone, setSplashDone] = useState(false);

// hideAsync only when BOTH conditions are true
useEffect(() => {
  if (isReady && splashDone) SplashScreen.hideAsync();
}, [isReady, splashDone]);

// SplashScreenView stays visible until BOTH conditions are met
if (!isReady || !splashDone) {
  return <SplashScreenView onFinish={() => setSplashDone(true)} />;
}
```

With `loop={false}` on Shiba in SplashScreenView, the animation plays once, `onAnimationFinish` fires, `setSplashDone(true)` updates state, the effect re-runs with both conditions true, `hideAsync()` fires, native splash fades *while SplashScreenView is still the rendered React tree*, then React re-renders to Stack.

The user sees: native splash → Shiba animation (fully visible) → main tabs. AC-4 passes.

### Gap 3 — Accessibility props directly on `LottieView` may fail TypeScript strict mode [STRONGLY RECOMMENDED]

`LottieView` in `lottie-react-native` is a forwardRef component wrapping a native view. Whether `accessibilityLabel` and `accessibilityRole` are in `LottieViewProps` depends on whether the package's TypeScript interface explicitly extends `ViewProps`. In lottie-react-native v7, `LottieViewProps` does not guarantee extension of `ViewAccessibilityProps` — in strict mode, passing undeclared props to a typed component is a compilation error.

The safe pattern for any React Native third-party component where prop coverage is uncertain: wrap in a `View` and put accessibility props on the `View`:
```tsx
<View
  style={[{ width: size, height: size }, style]}
  accessibilityLabel={`Shiba ${variant}`}
  accessibilityRole="image"
>
  <LottieView
    source={ANIMATIONS[variant]}
    style={StyleSheet.absoluteFill}
    ...
  />
</View>
```

`View` always accepts all accessibility props in its TypeScript interface. This also gives the accessibility tree a clear container element, which is the correct semantic structure for a decorative animation.

### Gap 4 — Incorrect install rationale for `react-native-reanimated` [STRONGLY RECOMMENDED]

The original plan states: "Both packages require a native rebuild..." under a note that implies `react-native-reanimated` is a dependency of `lottie-react-native`. The BOUNDARIES section also states: "react-native-reanimated is installed here as a dependency of lottie-react-native."

This is incorrect. `lottie-react-native` v7's peer dependencies are only `react` and `react-native`. `react-native-reanimated` is a separate, independent package installed in Phase 1 because:
1. The ROADMAP tech stack lists "React Native Reanimated + Lottie" as the animation layer
2. Phase 2 mascot reactions will require Reanimated worklets for smooth animation chaining
3. The 01-04 audit deferred a MoodBubble Reanimated upgrade — that upgrade requires Reanimated to be installed first

Incorrect rationale in plan comments propagates to SUMMARY.md and future audits. Corrected to: "installed per ROADMAP tech stack; Phase 2 mascot animations and future MoodBubble upgrade will use it."

---

## 4. Upgrades Applied to Plan

### Must-Have (Release-Blocking)

| # | Finding | Plan Section Modified | Change Applied |
|---|---------|----------------------|----------------|
| 1 | `ANIMATIONS: Record<ShibaVariant, object>` strict-mode failure | Task 3, Animation map | Removed explicit type annotation; added inline comment explaining why — require() infers any, which is assignable to AnimationObject without the index-signature mismatch |
| 2 | SplashScreenView never visible — hideAsync timing bug | Task 4, Component spec + Task 5, _layout.tsx wiring | Task 4: added `onFinish: () => void` required prop to SplashScreenView; `loop={false}` on Shiba. Task 5: complete _layout.tsx rewrite with `splashDone` state, two-condition `useEffect`, updated null guard with onFinish callback |

### Strongly Recommended

| # | Finding | Plan Section Modified | Change Applied |
|---|---------|----------------------|----------------|
| 3 | LottieView accessibility props may not be in TypeScript interface | Task 3, Component spec | Replaced direct `accessibilityLabel`/`accessibilityRole` on LottieView with a `View` wrapper; LottieView uses `StyleSheet.absoluteFill` to fill the wrapper; added inline comment explaining the pattern |
| 4 | Incorrect reanimated install rationale | Task 1, Install note | Corrected to: independent package installed per ROADMAP tech stack; Phase 2 animations and MoodBubble upgrade are the actual consumers |

### Deferred (Can Safely Defer)

| # | Finding | Rationale for Deferral |
|---|---------|------------------------|
| 1 | Minimum animation duration for slow auth | If auth takes longer than the animation (~1-2s), SplashScreenView shows a frozen last frame. Acceptable loading UX for Phase 1. Phase 2 can add a minimum duration or re-loop if needed based on real-device testing. |
| 2 | Android `hardwareAccelerationAndroid` prop on LottieView | Some complex Lottie animations require explicit hardware acceleration on Android for smooth playback. Cannot verify without a physical Android device and the real Shiba assets. Verify in Phase 2 on Android. |
| 3 | Safe area padding on SplashScreenView | Centered `flex: 1` content won't overlap system UI on notched devices (content is mid-screen, not edge-adjacent). Verify on notched device in Phase 2 when Shiba first appears in onboarding. |

---

## 5. Audit & Compliance Readiness

**Animation visibility correctness:** Both must-have fixes address the same root concern — a Phase 1 plan that "validates Lottie integration" must actually produce a visible animation. The timing fix is the critical one: without it, the entire plan delivers infrastructure that works but is never exercised by a user. The `splashDone` two-condition gate is the standard React Native pattern for coordinating async initialization with an animation gate.

**TypeScript strict-mode compliance:** The `object` vs `AnimationObject` issue would have produced a compilation error caught immediately during APPLY. The fix (remove annotation) is not a workaround — it's the correct TypeScript pattern for requiring-JSON-into-a-prop-typed-component. `any` is the intended type for `require()` results.

**Accessibility:** The `View` wrapper pattern for accessibility on third-party native components is standard React Native practice (WCAG 1.1.1 for non-text content). The `accessibilityRole="image"` correctly labels the Shiba as a decorative image. For Phase 2, when the Shiba actively reacts to mood selections, the label should update to describe the emotional context ("Shiba reacting with excitement").

**Dependency clarity:** Correcting the Reanimated rationale ensures the SUMMARY.md (which future plans reference) accurately reflects the dependency graph. A future Phase 2 plan that references "why is reanimated installed" will get the correct answer from the SUMMARY.

---

## 6. Final Release Bar

**What must be true before this plan ships:**
- `npx tsc --noEmit` is clean
- `ANIMATIONS` map has no explicit `Record<ShibaVariant, object>` annotation
- `Shiba.tsx` wraps LottieView in a `View` for accessibility props
- `SplashScreenView` accepts `onFinish: () => void` and passes it to Shiba
- Shiba in SplashScreenView uses `loop={false}`
- `_layout.tsx` has `splashDone` state
- `_layout.tsx` useEffect condition is `isReady && splashDone`
- `_layout.tsx` renders `<SplashScreenView onFinish={() => setSplashDone(true)} />` when `!isReady || !splashDone`

**Remaining risks if shipped as-is (post-remediation):**
- Real Shiba animation visibility requires native device testing (`npx expo prebuild` + custom dev client) — Expo Go does not support lottie-react-native; tsc only verifies compile-time correctness
- Slow auth (>2s) shows frozen Shiba last frame — acceptable for Phase 1, monitor in Phase 2
- Android Lottie animation quality unverified until physical device test

**Sign-off statement:** I would approve this plan for execution with the applied remediations. The infrastructure is correct (Expo install, config plugin, babel plugin order), the component architecture is sound (variant map, View wrapper, loop={false}), and the timing fix produces a plan that actually delivers what it claims — a user-visible Shiba animation that validates Lottie end-to-end before Phase 2 depends on it.

---

**Summary:** Applied 2 must-have + 2 strongly-recommended upgrades. Deferred 3 items.
**Plan status:** Updated and ready for APPLY.

---
*Audit performed by PAUL Enterprise Audit Workflow*
*Audit template version: 1.0*

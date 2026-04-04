---
phase: 02-onboarding
plan: 03
audit_date: 2026-04-04
auditor: Senior Principal Engineer + Compliance Reviewer
verdict: Conditionally Acceptable → Ready
applied: [M1, M2, M3, M4, M5, SR1, SR2]
deferred: [D1, D2, D3]
---

# Audit: 02-03-PLAN.md — Social/Mental/Goals + Notification Permission + Onboarding Gate

## 1. Executive Verdict

**Conditionally Acceptable → Ready**

The plan correctly closes Phase 2 with the remaining profile screens and the onboarding gate. However, five issues required mandatory fixes: a duplicated local type, a missing error boundary on an async permission call, a Zustand persist hydration race condition (would incorrectly redirect all returning users to onboarding on every cold start), a blocked human-verify checkpoint (auth timeout), and a missing try-catch that could permanently trap a user after `setComplete()` was called. All five are now fixed.

Applied 5 must-have + 2 strongly-recommended. Deferred 3 items. Plan approved for APPLY.

---

## 2. What Is Solid

| Area | Finding |
|------|---------|
| Multi-select toggle | `toggleGoal` / `toggleSlot` as module-level pure functions — consistent with `shibaVariant` pattern from 02-01 |
| `accessibilityRole="checkbox"` | Correct role for multi-select chips (goals, slots); `radio` would be wrong here |
| `router.replace` on completion | Prevents back-navigation into onboarding from main app — correct |
| `setComplete()` before `router.replace()` | Ensures gate store is updated before the gate screen is reached — correct ordering |
| Slot defaults `['morning', 'evening']` | Sensible pre-selection reduces friction; user can deselect if needed |
| `partialize` pattern (post-M3) | Correctly excludes `_hasHydrated` from AsyncStorage — transient state must not be persisted |
| `SlotOption` local interface | Genuinely extends `PickerOption` (adds `hint`) — justified local type |
| `scrollable={true}` explicit | All screens use explicit scrollable prop — no repeat of M3 from 02-02 audit |
| `handleContinue` null guards | All screens have `if (!canContinue) return` consistently |
| `(tabs)` initialRouteName unchanged | `initialRouteName="(tabs)"` stays; gate handles redirect — not initialRouteName |

---

## 3. Enterprise Gaps and Latent Risks

### Must-Have Findings

**M1 — Local `GoalOption` type duplicates `PickerOption`**
- **Location:** `app/(onboarding)/profile-goals.tsx` — module-level constants
- **Issue:** Plan defined `interface GoalOption { label: string; value: string; }` which is byte-for-byte identical to `PickerOption` from `@models/index`. Duplicate structural types for the same concept create confusion about the canonical source of truth.
- **Risk:** Developers reading goals screen import a different type name for identical data; future refactors diverge the types; `PickerOption` changes don't propagate
- **Status:** Applied → `GoalOption` removed; `PickerOption` imported from `@models/index`

**M2 — `requestPermissionsAsync()` not wrapped in try-catch**
- **Location:** `app/(onboarding)/notification-permission.tsx` — `handleEnable`
- **Issue:** The plan called `setComplete()` first, then `await Notifications.requestPermissionsAsync()`, then `router.replace('/(tabs)')`. If `requestPermissionsAsync()` throws (API unavailable, native module not linked after skip-notifications choice, etc.), `router.replace` never fires. The user is stuck on the notification screen with `complete = true` already persisted — they cannot escape because the gate now passes but the app never navigated to `(tabs)`.
- **Risk:** User permanently stuck on notification screen; must uninstall app to recover
- **Status:** Applied → try-catch wraps `requestPermissionsAsync()`; `router.replace` moved to after the try-catch block (always fires)

**M3 — `onboardingGateStore` had no hydration state**
- **Location:** `src/store/onboardingGateStore.ts`
- **Issue:** Zustand persist reads from AsyncStorage asynchronously. On first render, before the async read completes, all stores return their default state (`complete: false`). The gate in `(tabs)/_layout.tsx` would see `complete = false` and fire `<Redirect href="/(onboarding)/first-mood" />` — for every returning user, on every cold start, until AsyncStorage resolves. This breaks AC-5 (gate allows tabs when complete = true) for all returning users.
- **Risk:** Critical UX regression — all users redirected to onboarding on every app launch, even after completion
- **Status:** Applied → `_hasHydrated` flag + `onRehydrateStorage` callback + `partialize` (excludes `_hasHydrated` from persistence) added to store

**M4 — Gate in `(tabs)/_layout.tsx` renders before hydration**
- **Location:** `app/(tabs)/_layout.tsx` — `TabLayout` component
- **Issue:** The plan's gate checked `if (!complete) return <Redirect>` without waiting for hydration. This is the consumer side of M3 — even after M3 adds `_hasHydrated` to the store, the gate must check it.
- **Risk:** Same as M3 — redirect fires before AsyncStorage value is known
- **Status:** Applied → gate now reads `_hasHydrated`; returns `null` while hydrating; only redirects when `_hasHydrated === true && !complete`

**M5 — Auth timeout missing; human-verify checkpoint would fail**
- **Location:** `src/hooks/useAuth.ts`
- **Issue:** Without Supabase credentials in `.env`, `signInAnonymously()` hangs indefinitely. `isReady` stays `false`. `SplashScreenView` renders forever. The gate in `(tabs)/_layout.tsx` is never reached. The plan's human-verify section stated "NO temporary _layout.tsx changes needed — simply reload the app" — this is only true after the timeout is added. Without it, the same auth bypass workaround as 02-01 and 02-02 would be required, contradicting the plan.
- **Risk:** Human-verify checkpoint cannot complete as documented; also a real production risk if Supabase is down during new user onboarding
- **Status:** Applied → 5-second `setTimeout` sets `isReady(true)` as failsafe; cleanup `clearTimeout` added to return function; `src/hooks/useAuth.ts` added to `files_modified`

### Strongly Recommended Findings

**SR1 — No loading state on `handleEnable`**
- **Location:** `app/(onboarding)/notification-permission.tsx`
- **Issue:** `handleEnable` is async (awaits permission dialog). Users can double-tap "Enable reminders" before the OS dialog appears, triggering two concurrent calls to `setComplete()` and `router.replace()`.
- **Status:** Applied → `const [requesting, setRequesting] = useState(false)` added; `loading={requesting}` passed to Button; early return guard on double-tap

**SR2 — Slot chip rendered as `label + '\n' + hint` string**
- **Location:** `app/(onboarding)/notification-permission.tsx` — slot chip rendering
- **Issue:** Single Text with embedded `\n` loses visual hierarchy (label and hint at same weight/size). Sighted users need to distinguish the primary label from the descriptive hint.
- **Status:** Applied → two `Text` children: `chipLabel` (sm, semibold) + `chipHint` (xs, regular, 75% opacity); `accessibilityLabel` unchanged (correctly announces both)

---

## 4. Concrete Upgrades Applied

| ID | Classification | Change |
|----|---------------|--------|
| M1 | Must-Have | `GoalOption` removed; `PickerOption` from `@models/index` used in profile-goals |
| M2 | Must-Have | try-catch wraps `requestPermissionsAsync()`; `router.replace` always fires in finally position |
| M3 | Must-Have | `_hasHydrated` + `onRehydrateStorage` + `partialize` added to `onboardingGateStore` |
| M4 | Must-Have | Gate renders `null` while `!_hasHydrated`; redirects only when hydrated + incomplete |
| M5 | Must-Have | 5-second auth timeout added to `useAuth.ts`; `clearTimeout` in cleanup |
| SR1 | Strongly Recommended | `requesting` state + `loading={requesting}` on Enable button |
| SR2 | Strongly Recommended | Slot chip: two `Text` children (label + hint) with distinct typography |

---

## 5. Audit and Compliance Readiness

| Standard | Status | Notes |
|----------|--------|-------|
| WCAG 2.1 AA — 1.3.1 Info and Relationships | Pass | checkbox role on multi-select chips; group role on chip wrapper |
| WCAG 2.1 AA — 2.5.5 Target Size | Pass | hitSlop extends touch targets |
| WCAG 2.1 AA — 4.1.2 Name, Role, Value | Pass | accessibilityRole + accessibilityState.checked on all chips |
| AsyncStorage rehydration safety | Pass (after M3+M4) | hydration guard prevents premature gate redirect |
| Error boundary on async API calls | Pass (after M2) | requestPermissionsAsync wrapped in try-catch |
| No double-submit | Pass (after SR1) | requesting guard on handleEnable |
| iOS App Store — notification permission | Pass | requestPermissionsAsync called on explicit user action (not auto-requested on launch) |
| router.replace on completion | Pass | back-navigation into onboarding prevented |

---

## 6. Final Release Bar

**Can APPLY proceed?** Yes.

All blocking issues resolved. The plan now correctly handles:
- Zustand persist hydration race (M3+M4) — critical for returning users
- Auth hang without Supabase credentials (M5) — required for checkpoint + resilience
- Permission API failure isolation (M2) — prevents stuck state
- Type consistency (M1) — `PickerOption` is the canonical chip option type

**Deferred items (acceptable):**

| ID | Item | Resolution Path |
|----|------|-----------------|
| D1 | Supabase profile write | Requires schema + credentials; deferred explicitly in plan boundaries |
| D2 | Notification scheduling | Phase 6 — `requestPermissionsAsync` result logged but not acted on |
| D3 | `resetComplete()` action for dev testing | Useful for dev debug screen; defer to Phase 9 settings screen |

---

*Audit by: Senior Principal Engineer + Compliance Reviewer*
*Plan: .paul/phases/02-onboarding/02-03-PLAN.md*
*Completed: 2026-04-04*

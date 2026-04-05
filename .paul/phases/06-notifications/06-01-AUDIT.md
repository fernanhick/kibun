# Enterprise Plan Audit Report

**Plan:** .paul/phases/06-notifications/06-01-PLAN.md
**Audited:** 2026-04-05
**Verdict:** Conditionally Acceptable → Ready (after applying findings)

---

## 1. Executive Verdict

**Conditionally Acceptable.** The plan has sound architecture — pure scheduling service, persisted store, clean separation from check-in slots. However, it shipped with two crash-path bugs (hydration race, unhandled promise rejection) that would cause silent scheduling failure on every cold start and potential crash during root layout mount. After applying the 2 must-have and 3 strongly-recommended fixes below, the plan is ready for APPLY.

Would I sign this for production? **Yes, after the applied fixes.** The remaining deferred items (custom Android channel, tap deep-linking, localization) are genuine polish, not latent risk.

---

## 2. What Is Solid

**Pure scheduling service design.** The plan explicitly keeps `notifications.ts` stateless — accepts slots as parameters, never imports the store. This makes the service testable, reusable from both onboarding and launch contexts, and prevents circular dependency chains. Correctly layered.

**Separate NotificationSlot type.** The plan identifies and documents the naming mismatch between notification slots (`'evening'`, `'pre-sleep'`) and check-in slots (`'night'`, `'pre_sleep'`). Creating a separate type prevents accidental cross-contamination. The explicit note in the context section is audit-defensible.

**Cancel-before-schedule pattern.** `scheduleSlotNotifications` cancels all existing notifications before scheduling new ones. This is idempotent — calling it N times produces the same result as calling it once. Prevents notification accumulation across app launches.

**Boundaries section.** Correctly protects moodEntryStore, onboardingGateStore, checkInSlot, moods, and other onboarding screens. Scope limits are realistic and well-delineated against Plan 06-02.

---

## 3. Enterprise Gaps Identified

### Gap 1: AsyncStorage Hydration Race (CRITICAL)

**Risk:** `useNotificationPrefsStore.getState()` in a `useEffect` on mount reads the Zustand in-memory state, which starts with defaults (`selectedSlots: []`, `permissionGranted: false`). The `persist` middleware hydrates asynchronously from AsyncStorage. On cold start, the useEffect fires before hydration completes → scheduling reads empty defaults → no notifications scheduled → user never gets reminders despite having enabled them.

**Evidence:** This is the exact same class of bug that required `_hasHydrated` in `onboardingGateStore.ts` (Phase 2, Plan 03 audit). The project has prior art for this failure mode.

**Impact:** Silent failure. No crash, no error, no log. User enables reminders, expects them, never receives them. Only discoverable through user reports.

### Gap 2: Unhandled Promise Rejection in Root Layout

**Risk:** `scheduleSlotNotifications` is async and calls `Notifications.cancelAllScheduledNotificationsAsync()` + multiple `scheduleNotificationAsync()`. Any of these can throw (permission revoked between launches, OS-level restrictions, Android background limits). An unhandled rejection during root layout mount can crash the app before ErrorBoundary catches it (ErrorBoundary catches render errors, not async rejections in useEffect).

**Evidence:** The plan explicitly said "Do NOT wrap in try-catch" — this is incorrect for an async operation in root layout. Compare to `initPurchases()` which IS wrapped in try-catch at module level for exactly this reason.

**Impact:** App crash on launch for users who previously granted permission but had it revoked (e.g., via OS Settings). Recovery requires clearing app data.

### Gap 3: Notification Handler Timing

**Risk:** `setNotificationHandler` called inside useEffect fires after React mount. If a scheduled notification fires while the app is foregrounding (between JS bundle load and first useEffect), the default handler (suppress all) applies — user sees nothing.

**Evidence:** The existing `_layout.tsx` already uses module-level side effects (`SplashScreen.preventAutoHideAsync()`, `initPurchases()`) for operations that must complete before React lifecycle.

**Impact:** Missed foreground notifications during the narrow window between JS init and first useEffect. Low probability but zero-cost fix.

### Gap 4: Permission Result Not Captured

**Risk:** The plan says "Check if permission granted from the result (status === 'granted')" but the current `handleEnable` code has `requestPermissionsAsync()` inside a try-catch that ignores the return value. `status === 'granted'` is a string comparison against an enum — fragile. The `PermissionResponse` object has a convenience `granted: boolean` field.

**Impact:** If the string comparison were used and Expo changed the enum, permission state would be incorrectly persisted as `false` even when granted.

### Gap 5: Trigger Type String Literal

**Risk:** `type: 'daily'` works at runtime because `SchedulableTriggerInputTypes.DAILY = "daily"`, but bypasses TypeScript enum safety. If Expo renamed the value in a future SDK, the string literal would silently fail to match.

**Impact:** Low immediate risk. TypeScript wouldn't catch the mismatch at compile time.

---

## 4. Upgrades Applied to Plan

### Must-Have (Release-Blocking)

| # | Finding | Plan Section Modified | Change Applied |
|---|---------|----------------------|----------------|
| 1 | AsyncStorage hydration race — getState() reads defaults before persist rehydrates | Task 3 action (_layout.tsx) | Added hydration-aware pattern: check persist.hasHydrated(), subscribe to onFinishHydration if not yet hydrated, cleanup listener on unmount |
| 2 | Unhandled promise rejection during root mount | Task 3 action (_layout.tsx), verification | Added try-catch with __DEV__ console.error around scheduling call; added verification checklist item |

### Strongly Recommended

| # | Finding | Plan Section Modified | Change Applied |
|---|---------|----------------------|----------------|
| 1 | setNotificationHandler must be at module level | Task 2 action (configureNotificationHandler), Task 3 action (_layout.tsx), verification | Changed from "call in useEffect" to "call at MODULE LEVEL outside component" matching existing SplashScreen/initPurchases pattern |
| 2 | Permission check should use result.granted boolean | Task 3 action (notification-permission.tsx), verification | Changed from `status === 'granted'` to `result.granted` boolean; specified capturing requestPermissionsAsync return value |
| 3 | Use SchedulableTriggerInputTypes.DAILY enum | Task 2 action (notifications.ts), verification | Added import of enum; changed trigger type from string literal to enum value; added verification checklist item |

### Deferred (Can Safely Defer)

| # | Finding | Rationale for Deferral |
|---|---------|----------------------|
| 1 | Custom Android notification channel with kibun branding | expo-notifications creates a default channel automatically. Custom channel is polish (user-facing channel name/description in Android Settings). Appropriate for Phase 9 or 06-02. |
| 2 | Notification tap deep-linking to check-in screen | Default behavior (open app to root) is acceptable for MVP. Deep-link to check-in modal is a UX enhancement for 06-02. |
| 3 | Notification body localization | Messages hardcoded in English. i18n is out of scope for v1 per PROJECT.md. |

---

## 5. Audit & Compliance Readiness

**Defensible audit evidence:** The plan produces verifiable artifacts — persisted store with known AsyncStorage key, scheduling service with deterministic slot-to-hour mapping, TypeScript compilation check. All are inspectable post-implementation.

**Silent failure prevention:** The hydration race fix (must-have #1) was the critical gap. Without it, the system would silently degrade — appearing to work (store has data, service exists) but never actually scheduling. Post-fix, the scheduling either succeeds (notifications appear) or fails loudly (try-catch logs in dev).

**Post-incident reconstruction:** If a user reports "no notifications," the debugging path is clear: check AsyncStorage for `kibun-notification-prefs`, verify `permissionGranted: true` and `selectedSlots` populated, check `Notifications.getAllScheduledNotificationsAsync()` for active triggers.

**Ownership:** Scheduling is centralized in `notifications.ts`. No scattered scheduling calls. Single cancel-and-reschedule pattern means the source of truth for active notifications is always the store, and the scheduled state is always fresh.

---

## 6. Final Release Bar

**What must be true before this plan ships:**
- Scheduling in _layout.tsx waits for persist hydration — no silent skip on cold start
- Scheduling wrapped in try-catch — no crash if permission revoked
- setNotificationHandler called at module level — no missed foreground notifications
- SchedulableTriggerInputTypes.DAILY enum used — type-safe trigger specification
- result.granted used for permission check — correct Expo API usage

**Risks remaining if shipped as-is (after fixes):**
- Default Android notification channel (cosmetic — shows "Default" in Android notification settings)
- No deep-link on tap (user lands at last screen, not check-in)
- No test coverage for scheduling logic (Phase 9 testing scope)

**Sign-off:** After the 5 applied fixes, I would sign this plan for production. The remaining risks are genuine deferrals with clear resolution paths, not hidden gaps.

---

**Summary:** Applied 2 must-have + 3 strongly-recommended upgrades. Deferred 3 items.
**Plan status:** Updated and ready for APPLY

---
*Audit performed by PAUL Enterprise Audit Workflow*
*Audit template version: 1.0*

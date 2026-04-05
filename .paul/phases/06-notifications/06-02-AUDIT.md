# Enterprise Plan Audit Report

**Plan:** .paul/phases/06-notifications/06-02-PLAN.md
**Audited:** 2026-04-05
**Verdict:** Conditionally Acceptable -> Ready (after applying findings)

---

## 1. Executive Verdict

**Conditionally Acceptable.** The plan has clean architecture — single cancel-all-then-schedule flow, pure service, correct scope boundaries. However, it had two functional gaps: (1) permission status goes stale after returning from OS Settings because the screen uses useEffect instead of useFocusEffect, making the "Open Settings" flow a dead end that never updates, and (2) rapid switch toggling produces duplicate notifications from interleaved async scheduling calls. After applying the 2 must-have and 2 strongly-recommended fixes, the plan is ready for APPLY.

Would I sign this for production? **Yes, after the applied fixes.** The settings screen UX is straightforward, the streak nudge integrates cleanly into the existing scheduling flow, and the remaining deferred items are cosmetic.

---

## 2. What Is Solid

**Single scheduling flow.** The plan correctly integrates streak nudge into the existing `scheduleSlotNotifications` rather than creating a parallel scheduler. Cancel-all-then-schedule remains idempotent — one function, one source of truth, no interleaving between separate scheduling paths.

**Pure service maintained.** `notifications.ts` continues to accept data as parameters without importing stores. The screen reads the store and passes values. This keeps the service testable and prevents circular dependencies.

**Boundaries are precise.** The plan explicitly excludes Phase 9 settings features (account, theme, version) and Phase 7 entries display. This prevents the settings screen from becoming a scope-creep dumping ground.

**Permission check via getPermissionsAsync.** The plan correctly reads actual OS state on screen load rather than trusting the stored `permissionGranted` boolean, which could be stale if the user revoked permission via OS Settings between sessions.

---

## 3. Enterprise Gaps Identified

### Gap 1: Permission Status Stale After OS Settings Round-Trip (CRITICAL)

**Risk:** The plan uses `useEffect` to check permission on mount. When user taps "Open Settings" banner, the OS settings app opens. When user returns to kibun, the settings screen is already mounted — `useEffect([])` does NOT re-run. The banner persists showing "disabled" even if the user just enabled notifications. The toggles remain disabled. The user has no way to proceed without killing and restarting the app.

**Evidence:** `useFocusEffect` is available in `expo-router` (confirmed in `node_modules/expo-router/build/useFocusEffect.d.ts`). This is the standard React Navigation pattern for refreshing data when a screen regains focus.

**Impact:** Complete UX dead end. The primary remediation path (user denied → opens settings → enables → returns) doesn't work.

### Gap 2: Race Condition on Rapid Toggle (HIGH)

**Risk:** Each Switch toggle calls the reschedule helper, which runs `cancelAllScheduledNotificationsAsync` then loops `scheduleNotificationAsync` for each slot. If the user toggles two switches within milliseconds:
- Toggle A: cancelAll → schedule [morning, evening]
- Toggle B (starts before A finishes): cancelAll → schedule [morning]
- Toggle A's remaining `scheduleNotificationAsync` calls execute AFTER Toggle B's cancelAll, adding orphaned notifications

**Impact:** Duplicate notifications at the same time. User receives 2x morning reminders. Not harmful but damages trust — notification spam is the #1 reason users disable notifications entirely.

### Gap 3: files_modified Missing notification-permission.tsx

**Risk:** Task 1 step 4 explicitly modifies `notification-permission.tsx` but it's not in frontmatter `files_modified`. Conflict detection tools won't flag this file if another plan touches it.

**Impact:** Low immediate risk (only one plan in this phase), but breaks the audit trail.

### Gap 4: Store permissionGranted Drift

**Risk:** `permissionGranted` in the store is set during onboarding and never re-synced. If the user revokes permission in OS Settings, the store still shows `true`. On next app launch, `_layout.tsx` reads `permissionGranted: true` and tries to schedule — the calls fail silently. Not a crash, but wasted work and a latent inconsistency.

**Impact:** Store diverges from OS reality. Any future code that trusts `permissionGranted` without re-checking OS state will make wrong decisions.

---

## 4. Upgrades Applied to Plan

### Must-Have (Release-Blocking)

| # | Finding | Plan Section Modified | Change Applied |
|---|---------|----------------------|----------------|
| 1 | files_modified missing notification-permission.tsx | Frontmatter | Added `app/(onboarding)/notification-permission.tsx` to files_modified |
| 2 | Permission status stale after OS Settings round-trip | Task 2 imports + component structure | Changed useEffect to useFocusEffect from expo-router; added useFocusEffect import; permission re-checked on every screen focus |

### Strongly Recommended

| # | Finding | Plan Section Modified | Change Applied |
|---|---------|----------------------|----------------|
| 1 | Store permissionGranted drift from OS state | Task 2 component structure | Added store.setPermissionGranted(result.granted) sync when re-checking permission on focus |
| 2 | Race condition on rapid toggle | Task 2 reschedule helper | Added 300ms debounce requirement using useRef timer; clear previous timeout on each toggle |

### Deferred (Can Safely Defer)

| # | Finding | Rationale for Deferral |
|---|---------|----------------------|
| 1 | Permission banner uses errorLight color for non-error state | Cosmetic — no warningLight in theme; errorLight is the closest warm/attention color available. Can revisit in Phase 9 polish. |
| 2 | Evening slot (19:00) + streak nudge (20:00) proximity | Intentional — different copy, different purpose (check-in reminder vs streak reminder). Not a bug, just close timing. |

---

## 5. Audit & Compliance Readiness

**Defensible audit evidence:** The plan produces a visible, testable settings screen. Permission state is checkable via `getPermissionsAsync`. Scheduled notifications are inspectable via `getAllScheduledNotificationsAsync`. Store state is in AsyncStorage under a known key.

**Silent failure prevention:** The useFocusEffect fix eliminates the most likely silent failure — user enables permission in OS but app doesn't reflect it. The debounce prevents duplicate notification accumulation. The try-catch in the reschedule helper surfaces errors in dev.

**Post-incident reconstruction:** If a user reports duplicate notifications, the debugging path: check `Notifications.getAllScheduledNotificationsAsync()` for duplicate trigger times. If duplicates found, the debounce didn't catch a rapid-toggle edge case. Single clear remediation: increase debounce or add a scheduling mutex.

**Ownership:** Notification preferences have one source of truth (notificationPrefsStore), one scheduling path (scheduleSlotNotifications), and one UI surface (settings.tsx). No scattered state.

---

## 6. Final Release Bar

**What must be true before this plan ships:**
- useFocusEffect re-checks permission on every screen focus (not just mount)
- Store permissionGranted synced with OS state on focus
- Reschedule debounced to prevent duplicate notifications from rapid toggling
- notification-permission.tsx listed in files_modified

**Risks remaining if shipped as-is (after fixes):**
- No "request permission" button on settings screen for `undetermined` state (user must go to OS settings) — acceptable, standard iOS/Android pattern
- Streak nudge fires even on days user already checked in — documented as intentional (local-only limitation)
- No test coverage for scheduling race condition — Phase 9 testing scope

**Sign-off:** After the 4 applied fixes, I would sign this plan for production. The settings screen is simple, the scheduling flow is clean, and the deferred items are genuinely cosmetic.

---

**Summary:** Applied 2 must-have + 2 strongly-recommended upgrades. Deferred 2 items.
**Plan status:** Updated and ready for APPLY

---
*Audit performed by PAUL Enterprise Audit Workflow*
*Audit template version: 1.0*

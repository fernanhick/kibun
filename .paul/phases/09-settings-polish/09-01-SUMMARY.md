---
phase: 09-settings-polish
plan: 01
subsystem: settings-account-banner
tags: [settings, account, sign-out, anonymous-banner, deep-link, notification-routing]

requires:
  - phase: 08-cloud-ai-layer
    plan: 02
    provides: push token in user_metadata, /ai-report route, push notification data payload
  - phase: 03-paywall-auth
    provides: sessionStore with authStatus/subscriptionStatus, onboardingGateStore

provides:
  - uiPrefsStore (bannerDismissedAt persistence — 7-day banner reappear)
  - AccountScreen (/account route) — anonymous CTA + registered account/subscription/sign-out
  - SettingsScreen restructured as hub (Account → Notifications → About sections)
  - Dismissible anonymous banner on HomeScreen with 7-day reappear
  - Notification deep link: ai_report tap → /ai-report route

affects: [phase-9-plan-02-quality-gate]

tech-stack:
  added: []
  patterns: [uiPrefsStore-persist-timestamp, Href-cast-for-unregistered-routes, notification-response-listener-in-root-layout, fire-and-forget-push-token-revocation]

key-files:
  created: [src/store/uiPrefsStore.ts, app/account.tsx]
  modified: [app/(tabs)/settings.tsx, app/(tabs)/index.tsx, app/_layout.tsx]

key-decisions:
  - "useRouter() in RootLayout: valid — Expo Router renders _layout.tsx inside navigation context"
  - "'/account' as Href cast required: Expo Router typed routes don't know about dynamic stack screens until prebuild — same pattern as '/check-in' in HomeScreen"
  - "PRIVACY_POLICY_URL named constant with TODO comment: makes placeholder visible before App Store submission review"
  - "Push token revocation fire-and-forget: sign-out must not fail if network call fails"
  - "useOnboardingGateStore.setState() directly: no reset() action exists — Zustand supports direct setState() on any store"

patterns-established:
  - "Href cast for stack-only routes: router.push('/account' as Href) — typed routes only know about (tabs) routes until prebuild"
  - "Notification response listener in RootLayout: addNotificationResponseReceivedListener in useEffect([router]) — cleanup via sub.remove()"
  - "Banner dismissal pattern: timestamp in persisted store + derived showBanner = isAnonymous && (dismissed === null || elapsed > SEVEN_DAYS_MS)"

duration: ~10min
started: 2026-04-05
completed: 2026-04-05
---

# Phase 9 Plan 01: Settings & Polish — Account, Settings Hub, Banner, Deep Link

**AccountScreen with anonymous/registered states and sign-out. SettingsScreen restructured into hub. Anonymous banner made dismissible with 7-day reappear. Notification deep link from push tap to AIReportScreen. Phase 9 Plan 01 complete.**

## Performance

| Metric | Value |
|--------|-------|
| Duration | ~10min |
| Started | 2026-04-05 |
| Completed | 2026-04-05 |
| Tasks | 4 completed (3 auto, 1 auto with auto-fix) |
| Files created | 2 |
| Files modified | 3 |

## Acceptance Criteria Results

| Criterion | Status | Notes |
|-----------|--------|-------|
| AC-1: Banner dismissible with 7-day reappear | Pass | uiPrefsStore persists timestamp; showBanner derived; dismiss button with Ionicons close |
| AC-2: AccountScreen anonymous state | Pass | person-circle-outline icon + "Not signed in" + Create account CTA → /register |
| AC-3: AccountScreen registered state | Pass | email via getUser() + SubscriptionBadge + sign out button |
| AC-4: AccountScreen sign out flow | Pass | push token revocation (fire-and-forget) → signOut → gate reset → navigate |
| AC-5: SettingsScreen proper hub | Pass | Title "Settings"; Account section → Notifications sections → About section with version |
| AC-6: Notification deep link → AIReportScreen | Pass | addNotificationResponseReceivedListener in _layout.tsx; data.type==='ai_report' → router.push('/ai-report') |
| AC-7: Zero TypeScript errors | Pass | npx tsc --noEmit exits 0 after Href cast fix |

## Accomplishments

- Resolved Phase 8 deferred item D-3: push token revoked on sign-out (fire-and-forget)
- Resolved Phase 8 deferred item D-4: deep link from notification tap to AIReportScreen
- Anonymous banner is now dismissible — prevents "banner blindness" from persistent undismissable UI
- SettingsScreen is now a proper product hub, not a notification-only screen
- Full sign-out flow implemented: all state cleared, user safely returned to onboarding

## Files Created/Modified

| File | Change | Purpose |
|------|--------|---------|
| `src/store/uiPrefsStore.ts` | Created | Persisted banner dismissal timestamp with dismissBanner/resetBanner |
| `app/account.tsx` | Created | AccountScreen: anonymous gate + registered account/subscription + sign-out |
| `app/(tabs)/settings.tsx` | Modified | Restructured: title "Settings", added Account section, About section with version/privacy |
| `app/(tabs)/index.tsx` | Modified | Dismissible anonymous banner: showBanner, dismiss Pressable, uiPrefsStore wiring |
| `app/_layout.tsx` | Modified | Added account Stack.Screen + notification response deep link handler |

## Decisions Made

| Decision | Rationale | Impact |
|----------|-----------|--------|
| `'/account' as Href` cast in settings.tsx | Expo Router typed routes only know about (tabs) routes until prebuild — same pattern as '/check-in' in HomeScreen | No functional impact; required for tsc pass |
| `PRIVACY_POLICY_URL` named constant | Placeholder URL needs TODO comment to be visible before App Store submission | Easy to find and update in Phase 9 Plan 02 store prep |
| `useRouter()` in RootLayout | Valid — Expo Router renders _layout.tsx inside navigation context | Pattern confirmed; router available for deep link handler |

## Deviations from Plan

### Summary

| Type | Count | Impact |
|------|-------|--------|
| Auto-fixed | 1 | Href cast for /account route |
| Scope additions | 0 | — |
| Deferred | 0 | — |

**Total impact:** One tsc error caught during qualify — identical pattern already in codebase.

### Auto-fixed Issues

**1. `'/account' as Href` cast required in settings.tsx**
- **Found during:** Task 3 qualify step (tsc error TS2345)
- **Issue:** Expo Router's typed routes don't include `/account` (a stack-only screen) until `expo prebuild` regenerates the type definitions. The `router.push('/account')` call fails type-check.
- **Fix:** Added `type Href` import from `expo-router` and cast: `router.push('/account' as Href)`
- **Files:** `app/(tabs)/settings.tsx`

## Deferred Issues Resolved

| Issue | From Plan | Resolution |
|-------|-----------|------------|
| Push token not revoked on sign-out | 08-02 audit D-3 | ✓ Resolved — supabase.auth.updateUser({ data: { expo_push_token: null } }) in handleSignOut |
| Deep link from push notification tap → AIReportScreen | 08-02 scope | ✓ Resolved — addNotificationResponseReceivedListener in _layout.tsx |

## Deferred Issues Remaining

| Issue | Resolution Path |
|-------|-----------------|
| Cold-start notification routing edge case | Plan 09-02 — verify on real device; if broken, guard router.push behind isReady flag |
| PRIVACY_POLICY_URL placeholder | Plan 09-02 store prep — replace with real URL before App Store submission |

## Skill Audit

All required skills loaded in session context:
- /react-native-best-practices ✓
- /react-native-design ✓
- /expo-react-native-javascript-best-practices ✓
- /accessibility ✓

---
*Phase: 09-settings-polish, Plan: 01*
*Completed: 2026-04-05*

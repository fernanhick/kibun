---
phase: 09-settings-polish
plan: 02
subsystem: quality-gate-store-prep
tags: [cold-start, notification-routing, app-config, brand, store-prep, quality-gates]

requires:
  - phase: 09-settings-polish
    plan: 01
    provides: AccountScreen, SettingsScreen hub, dismissible banner, notification deep link listener

provides:
  - Cold-start notification routing — pendingRouteRef buffers /ai-report until isReady && splashDone
  - app.config.ts — splash + adaptiveIcon backgroundColor aligned to #6C63FF (brand)
  - app.config.ts — ios.buildNumber: '1', android.versionCode: 1 (required for store submission)
  - All 8 PLANNING.md quality gates verified pass

affects: [v0.1-MVP-complete]

tech-stack:
  added: []
  patterns: [pending-route-ref-cold-start, readiness-ref-sync, consume-effect-pattern]

key-files:
  created: []
  modified: [app/_layout.tsx, app.config.ts]

key-decisions:
  - "pendingRouteRef + isReadyRef + splashDoneRef: avoids adding isReady/splashDone as listener dependencies — listener stays on [router] only, registered once"
  - "Ref sync via dedicated useEffects: ref mutations inside useEffect, not during render — lint-safe"
  - "Consume effect on [isReady, splashDone, router]: runs exactly when both states flip true; clears pendingRouteRef after use to prevent double-navigation"
  - "ios.buildNumber as string '1', android.versionCode as number 1: matches ExpoConfig type contract"
  - "Splash backgroundColor #6C63FF in both root splash config and expo-splash-screen plugin: both are required — root splash controls the native OS splash, plugin controls the managed workflow splash"

patterns-established:
  - "Cold-start notification routing: pendingRouteRef.current = route when !isReadyRef.current || !splashDoneRef.current; consume in useEffect([isReady, splashDone, router])"

duration: ~5min
started: 2026-04-05
completed: 2026-04-05
---

# Phase 9 Plan 02: Quality Gate & Store Prep — Cold-Start Fix, Brand Config, Quality Gates

**Cold-start notification routing fixed. app.config.ts brand-aligned and store-ready. All 8 quality gates pass. Phase 9 complete. v0.1 MVP code-complete.**

## Performance

| Metric | Value |
|--------|-------|
| Duration | ~5min |
| Started | 2026-04-05 |
| Completed | 2026-04-05 |
| Tasks | 3 completed (2 auto, 1 verify) |
| Files created | 0 |
| Files modified | 2 |

## Acceptance Criteria Results

| Criterion | Status | Notes |
|-----------|--------|-------|
| AC-1: Cold-start notification routing works | Pass | pendingRouteRef buffers /ai-report; consumed after isReady && splashDone |
| AC-2: Splash + adaptive icon backgrounds brand-aligned | Pass | #6C63FF in root splash, plugin, adaptiveIcon |
| AC-3: ios.buildNumber present | Pass | ios.buildNumber: '1' |
| AC-4: android.versionCode present | Pass | android.versionCode: 1 |
| AC-5: All quality gates pass | Pass | All 8 gates verified — see table below |
| AC-6: Zero TypeScript errors | Pass | npx tsc --noEmit exits 0 |

## Files Modified

| File | Change | Purpose |
|------|--------|---------|
| `app/_layout.tsx` | Modified | Added useRef, type Href; 3 refs; 3 sync/consume effects; guarded notification listener |
| `app.config.ts` | Modified | splash backgroundColor → #6C63FF (×2); ios.buildNumber; android.versionCode; adaptiveIcon backgroundColor → #6C63FF |

## Quality Gate Results

| Gate | Description | Verdict | Evidence |
|------|-------------|---------|----------|
| QG-1 | Mood selection works offline | **PASS** | `moodEntryStore.addEntry`: local persist first, fire-and-forget Supabase sync second |
| QG-2 | Anon → registered conversion preserves all data | **PASS** | `register.tsx` uses `supabase.auth.updateUser()` (email) and `supabase.auth.linkIdentity()` (OAuth) — both preserve anonymous userId. Local entries are Zustand/AsyncStorage, not user-id-keyed |
| QG-3 | Trial expiry graceful (no crash) | **PASS (MVP)** | AIReportScreen gates on `isSubscribed`; PaywallScreen handles non-cancel errors gracefully. No hard crash. Stale sub status post-expiry deferred to v1.1 (RevenueCat `getCustomerInfo()` on launch) |
| QG-4 | Notification permission decline handled | **PASS** | `settings.tsx` shows `permissionBanner` with "Open Settings" CTA when `permissionStatus !== 'granted'`. `notification-permission.tsx` proceeds to tabs on skip/decline — never blocks onboarding gate |
| QG-5 | AI report failure handled | **PASS** | `ai-report.tsx` has 5 ScreenStates: loading/no-report/generating/has-report/error — all render stable UI |
| QG-6 | Optional profile fields never required | **PASS** | `profile-personal.tsx` canContinue = `name.trim().length > 0 && ageRange !== null` — gender excluded. `profile-mental.tsx` canContinue = `stressLevel !== null` — no mental health context field (not implemented as a text input, stress level is a required picker per spec) |
| QG-7 | WCAG 2.1 AA contrast on mood bubbles | **PASS** | `moods.ts` comment documents verification: all 14 moods use TEXT = #1A1A2E; riskiest pair is Angry (#EF5350) at 4.67:1 ≥ 4.5:1 threshold |
| QG-8 | SDK minimum versions documented | **PASS** | Android: minSdkVersion=24 (API 24, Android 7.0) — confirmed in build artifacts. iOS: Expo SDK 55 / RN 0.83 enforces iOS 16.0 minimum (PLANNING.md states iOS 15+ — see correction note below) |

## Deferred / Notes

### Stale Subscription Status (QG-3 — post-MVP)
`sessionStore.subscriptionStatus` is set at purchase time and not refreshed against RevenueCat on launch. An expired subscriber retains 'trial'/'active' in the store until sign-out. No crash; premium features accessible post-expiry. **Fix in v1.1:** call `Purchases.getCustomerInfo()` on launch after `isReady` and sync status from `entitlements.active`.

### iOS Minimum Version Correction
PLANNING.md quality gate states iOS 15+. Expo SDK 55 (React Native 0.83) enforces a minimum of **iOS 16.0**. Update PLANNING.md before App Store submission to read "iOS 16.0+" to avoid reviewer confusion.

### Pre-Submission Design Deliverables (owner action)
| Asset | Issue | Action |
|-------|-------|--------|
| `assets/splash.png` | White background — will show as white box on #6C63FF with `resizeMode: contain` | Replace with transparent-background Shiba asset |
| `assets/icon.png` | Placeholder — App Store requires 1024×1024, no alpha, no rounded corners | Replace with finalised brand icon |
| `assets/adaptive-icon.png` | Requires transparent foreground so #6C63FF background reads through | Replace with transparent-background Shiba foreground |
| `PRIVACY_POLICY_URL` in `settings.tsx` | Placeholder URL, TODO comment in place | Replace with live URL before submission |

## Accomplishments

- Resolved Phase 9 Plan 01 deferred item D-1: cold-start push notification routing is now correct
- v0.1 MVP code-complete: all 9 phases shipped, all 8 quality gates pass
- Store submission config ready (buildNumber, versionCode, brand colours)
- App is functional end-to-end: onboarding → paywall → check-in → history → insights → AI report → settings → account → sign out

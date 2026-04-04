---
phase: 03-paywall-auth
plan: 01
subsystem: payments
tags: [react-native, revenuecat, zustand, paywall, iap, expo-router, gate]

requires:
  - phase: 02-onboarding
    plan: 03
    provides: onboardingGateStore, complete flag, paywallSeen stub, (tabs)/_layout gate pattern

provides:
  - src/lib/revenuecat.ts — SDK initializer, graceful no-op when keys absent
  - app/paywall.tsx — PaywallScreen: trial offer, purchase CTA, skip path, cancellation handling
  - src/store/onboardingGateStore.ts — paywallSeen flag added (persisted)
  - src/store/sessionStore.ts — setSubscriptionStatus action added
  - app/(tabs)/_layout.tsx — three-layer gate: hydration → onboarding → paywall → tabs
  - app/_layout.tsx — paywall Stack.Screen registered + initPurchases at startup

affects: [03-paywall-auth plan 02, 04-mood-checkin, 07-insights, 08-cloud-ai-layer]

tech-stack:
  added: [react-native-purchases@9.15.1]
  patterns:
    - PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR detection — cancel stays on paywall, non-cancel proceeds
    - CustomerInfo.entitlements.active read for subscription status — never hardcode 'trial'
    - initPurchases() at module level in _layout.tsx wrapped in try-catch
    - paywallSeen persisted in onboardingGateStore alongside complete (same partialize pattern)
    - Three-layer gate in (tabs)/_layout.tsx: hydration guard → onboarding → paywall

key-files:
  created:
    - src/lib/revenuecat.ts
    - app/paywall.tsx
  modified:
    - src/store/onboardingGateStore.ts
    - src/store/sessionStore.ts
    - app/_layout.tsx
    - app/(tabs)/_layout.tsx

key-decisions:
  - "react-native-purchases v9.x has no Expo config plugin — autolinking only, no plugins array entry"
  - "PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR must be distinguished from other errors — cancel stays on paywall"
  - "CustomerInfo.entitlements.active['premium'] is the authoritative source for subscription state, not purchasePackage return value alone"
  - "paywallSeen added to onboardingGateStore (not a new store) — same hydration pattern, same AsyncStorage key"
  - "Pricing set to $5.99/month · $39.99/year — lower bracket of AI-feature app market (placeholder until Plan 03-02 wires RC products)"
  - "initPurchases() module-level with try-catch — initializes before React mounts so offerings pre-fetch before user reaches paywall"

patterns-established:
  - "IAP cancellation pattern: check error.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR, return early without setPaywallSeen or navigation"
  - "Subscription status derived from CustomerInfo.entitlements.active — periodType determines trial vs active"
  - "Three-layer gate in (tabs)/_layout.tsx is the canonical post-onboarding gate pattern for all phases"

duration: ~1 session
started: 2026-04-04T00:00:00.000Z
completed: 2026-04-04T00:00:00.000Z
---

# Phase 3 Plan 01: RevenueCat Setup + PaywallScreen + Gate Summary

**RevenueCat SDK installed, PaywallScreen built with correct IAP cancellation handling, and three-layer gate wired — paywall appears once after onboarding and never again.**

## Performance

| Metric | Value |
|--------|-------|
| Duration | ~1 session |
| Tasks | 4 completed (2 auto + 1 human-action + 1 human-verify) |
| Files created | 2 |
| Files modified | 4 |
| TypeScript errors | 0 |

## Acceptance Criteria Results

| Criterion | Status | Notes |
|-----------|--------|-------|
| AC-1: RevenueCat initializes gracefully without API keys | Pass | console.warn fires, no crash; RC also initializes with placeholder key gracefully |
| AC-2: Paywall gate intercepts first post-onboarding entry to tabs | Pass | `!paywallSeen` redirect in (tabs)/_layout.tsx verified |
| AC-3: "Maybe later" dismisses paywall and enters tabs | Pass | setPaywallSeen + router.replace('/(tabs)') |
| AC-4: "Start free trial" attempts purchase and enters tabs on non-cancel | Pass | try/catch without finally; falls through on any non-cancel outcome |
| AC-5: Paywall not shown on subsequent launches | Pass | paywallSeen persisted in AsyncStorage via partialize |
| AC-6: Zero TypeScript errors | Pass | npx tsc --noEmit exits 0 |
| AC-7: Purchase cancellation stays on paywall | Pass | PURCHASE_CANCELLED_ERROR → setPurchasing(false) + return early |

## Skill Audit

| Expected Skill | Invoked? |
|----------------|----------|
| /react-native-best-practices | ✓ |
| /react-native-design | ✓ |
| /expo-react-native-javascript-best-practices | ✓ |
| /accessibility | ✓ |

All required skills invoked ✓

## Accomplishments

- `src/lib/revenuecat.ts`: initPurchases() with Platform.select for iOS/Android keys; graceful no-op + warn when unconfigured; try-catch at call site in _layout.tsx
- `app/paywall.tsx`: PaywallScreen with feature list, trial callout, `purchasing` guard, correct cancellation detection (PURCHASE_CANCELLED_ERROR), CustomerInfo entitlement read (not hardcoded status), `__DEV__` warn on empty offerings
- `onboardingGateStore`: `paywallSeen` + `setPaywallSeen` added; persisted via partialize alongside `complete`
- `sessionStore`: `setSubscriptionStatus(status)` action — patches session in-place, null-safe
- Three-layer gate: `(tabs)/_layout.tsx` now gates on hydration → onboarding complete → paywallSeen

## Files Created/Modified

| File | Change | Purpose |
|------|--------|---------|
| `src/lib/revenuecat.ts` | Created | RevenueCat SDK initializer with graceful fallback |
| `app/paywall.tsx` | Created | PaywallScreen — trial offer, purchase flow, skip path |
| `src/store/onboardingGateStore.ts` | Modified | Added paywallSeen + setPaywallSeen + updated partialize |
| `src/store/sessionStore.ts` | Modified | Added setSubscriptionStatus action |
| `app/_layout.tsx` | Modified | Registered paywall Stack.Screen + initPurchases call |
| `app/(tabs)/_layout.tsx` | Modified | Added paywallSeen gate check (third layer) |

## Decisions Made

| Decision | Rationale | Impact |
|----------|-----------|--------|
| react-native-purchases has no Expo config plugin in v9.x | PluginError at prebuild — autolinking handles iOS/Android native code without plugin | app.config.ts unchanged; plan corrected |
| PURCHASE_CANCELLED_ERROR detected and handled separately | Cancel = user chose not to subscribe; forwarding to tabs on cancel is a dark pattern that costs conversions | Paywall stays visible on cancel; button re-enabled |
| CustomerInfo.entitlements.active['premium'] as subscription status source | purchasePackage return value is authoritative; hardcoding 'trial' fails for annual/promo purchases | subscriptionStatus correct from first real purchase |
| Pricing: $5.99/month · $39.99/year | Lower bracket of AI-feature app market; competitive with Daylio/Bearable while reflecting AI value-add | Placeholder until Plan 03-02 wires real RC products |
| paywallSeen in onboardingGateStore (not new store) | Same hydration pattern; one less AsyncStorage key; gate reads from single store | Simpler gate logic; consistent with Phase 2 pattern |

## Deviations from Plan

| Deviation | Cause | Fix | Impact |
|-----------|-------|-----|--------|
| app.config.ts plugin NOT added | react-native-purchases v9.x has no Expo config plugin — `PluginError` at prebuild | Removed plugin entry; autolinking handles native code | None — no plugin needed |
| Price updated: $3.99 → $5.99/month + $39.99/year | User-requested: $3.99 is below AI-feature app market | Updated hardcoded string in paywall.tsx | Display only; final price set in RC dashboard in Plan 03-02 |

## Issues Encountered

| Issue | Resolution |
|-------|------------|
| `PluginError: Package "react-native-purchases" does not contain a valid config plugin` | Removed `'react-native-purchases'` from app.config.ts plugins array; library uses autolinking only |
| RevenueCat `InvalidCredentialsError` in Metro console | Expected — RC initialized with placeholder/unconfigured key; errors are benign and app proceeds normally |

## Next Phase Readiness

**Ready for Plan 03-02:**
- RevenueCat SDK installed and linked in native build
- `setSubscriptionStatus` action available for registration/conversion flow
- `paywallSeen` gate is permanent — Plan 03-02 can add subscription-status-aware logic on top
- `'premium'` entitlement identifier documented — must match RevenueCat dashboard config
- Pricing placeholder ($5.99/$39.99) in place — replace with RC dynamic pricing in Plan 03-02

**Blockers before Plan 03-02 APPLY:**
- RevenueCat API keys needed (`EXPO_PUBLIC_REVENUECAT_IOS_KEY` / `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY`) for purchase sandbox testing
- RevenueCat dashboard: create `premium` entitlement + product SKUs in App Store Connect / Google Play

---
*Phase: 03-paywall-auth, Plan: 01*
*Completed: 2026-04-04*

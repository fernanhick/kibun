# Enterprise Plan Audit Report

**Plan:** `.paul/phases/03-paywall-auth/03-01-PLAN.md`
**Audited:** 2026-04-04
**Verdict:** Conditionally Acceptable → Ready (after applied fixes)

---

## 1. Executive Verdict

**Conditionally Acceptable.** The plan's architecture is sound: the three-layer gate pattern is correct, SDK initialization is appropriately defensive, and the navigation flow is well-structured. However, two release-blocking gaps exist in the purchase flow — one a dark pattern that directly costs revenue (cancellation mis-handled), one a latent data integrity bug (subscription status hardcoded rather than read from authoritative source). Both are auto-applied and plan is ready for APPLY.

Would I sign off on this for production as-is? No. After applied fixes? Yes.

---

## 2. What Is Solid

- **paywallSeen + partialize pattern**: Correct reuse of the `_hasHydrated` + `partialize` pattern from Phase 2. AsyncStorage persistence is properly scoped — `paywallSeen` persists, transient state excluded.
- **purchasing guard**: Prevents double-tap race condition on the primary CTA. Correct.
- **Gate layer ordering**: `hydration → onboarding → paywall → tabs` is the correct sequence. Each layer is independently testable via its own flag.
- **Graceful no-op on missing API keys**: `initPurchases()` warns in dev and returns safely. Non-blocking for core functionality. Correct pattern for unconfigured SDK.
- **Scope discipline**: Boundaries correctly protect Phase 2 work. No scope creep into registration or OAuth (Plan 02).
- **SK initialization timing**: Module-level `initPurchases()` call (consistent with `SplashScreen.preventAutoHideAsync()` precedent) gives RevenueCat maximum time to fetch offerings before user reaches paywall.

---

## 3. Enterprise Gaps Identified

### M1: Purchase cancellation forwarded to tabs — revenue loss pattern
The original `finally` block unconditionally called `setPaywallSeen() + router.replace('/(tabs)')`. When the user cancels the native App Store / Play Store IAP dialog, RevenueCat throws `PURCHASE_CANCELLED_ERROR`. With the original code, this error is caught and then the `finally` runs anyway — marking the paywall as seen and navigating to tabs. The user explicitly chose not to subscribe, and the app treats it the same as completing a purchase. This directly loses trial conversions and is a dark pattern that would fail App Store review in regulated markets.

### M2: subscriptionStatus hardcoded as 'trial' — data integrity bug
`purchasePackage()` returns `{ customerInfo, productIdentifier }`. `customerInfo.entitlements.active` contains the authoritative subscription state from RevenueCat/App Store. Hardcoding `'trial'` means: (a) users on annual plans (no trial) get marked as 'trial'; (b) users on promotional offers or direct purchases get incorrect status; (c) any phase that gates features behind `subscriptionStatus` will make wrong decisions from the first real purchase.

### S1: No warning on empty offerings — invisible production failure
If RevenueCat dashboard has no products configured (or products are paused), `offerings.current` is null and `pkg` is undefined. The purchase CTA fires, nothing happens, and the user silently proceeds to tabs. In production, this would mean the paywall shows but never actually charges anyone — a catastrophic misconfiguration that would be invisible during development.

### S2: initPurchases() at module level has no error boundary
Module-level code runs before React mounts and before `ErrorBoundary` is in scope. If `Purchases.configure()` throws due to a device-specific native module edge case, the app crashes with no recovery path. Wrapping the call site in try-catch provides a last-resort safety net without changing the initialization timing.

---

## 4. Upgrades Applied to Plan

### Must-Have (Release-Blocking)

| # | Finding | Plan Section Modified | Change Applied |
|---|---------|----------------------|----------------|
| M1 | Purchase cancellation forwarded to tabs | Task 3 — handlePurchase code | Restructured without `finally`. Added `PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR` check: on cancel, calls `setPurchasing(false)` and `return`s early — skips `setPaywallSeen` and navigation. Added AC-7. |
| M2 | `setSubscriptionStatus('trial')` hardcoded | Task 3 — handlePurchase code | Changed to read `customerInfo.entitlements.active['premium']` from `purchasePackage` return value. Uses `periodType === 'TRIAL'` to distinguish trial from active. Documented that 'premium' entitlement identifier must match RevenueCat dashboard config. |

### Strongly Recommended

| # | Finding | Plan Section Modified | Change Applied |
|---|---------|----------------------|----------------|
| S1 | No warning on empty offerings | Task 3 — handlePurchase code | Added `if (!pkg)` branch with `__DEV__` console.warn pointing to RevenueCat dashboard config. Added to verification checklist. |
| S2 | initPurchases() call site unprotected | Task 3 — _layout.tsx section | Wrapped `initPurchases()` call in try-catch with `__DEV__` console.error. Added to verification checklist. |

### Deferred (Can Safely Defer)

| # | Finding | Rationale for Deferral |
|---|---------|----------------------|
| D1 | Hardcoded price "$3.99/month" in UI | Already in plan SCOPE LIMITS. App Store review is not in scope for Plan 03-01. Plan 03-02 deferred this correctly. |
| D2 | No `Purchases.addCustomerInfoUpdateListener()` | Async subscription status sync is a Plan 03-02 concern. Not needed for initial purchase flow. |
| D3 | No restore purchases flow | Out of scope per plan boundaries. Plan 03-02 or later. |

---

## 5. Audit & Compliance Readiness

**Silent failure risk:** Before M1 fix, cancellation silently completed the paywall flow — no log, no error, no audit trail of the incorrect state transition. After fix, cancellation is a named, handled code path.

**Data integrity:** Before M2 fix, subscriptionStatus in sessionStore would diverge from actual RevenueCat/App Store state immediately on first purchase. After fix, status is derived from the authoritative source.

**Reconstruction:** `__DEV__` console.warn on missing offerings (S1) gives developers visibility into a production misconfiguration before launch. Without it, a wrong RevenueCat dashboard configuration is invisible.

**Ownership:** The `'premium'` entitlement identifier must be documented as a configuration contract between the app and RevenueCat dashboard. The plan now calls this out explicitly.

**Compliance gaps remaining:**
- Price display (hardcoded $3.99) would fail App Store review — deferred to Plan 03-02 intentionally
- No privacy policy link on PaywallScreen — not in project scope for this plan
- Subscription terms disclosure — deferred

---

## 6. Final Release Bar

**What must be true before this plan ships:**
- M1 fix in place: cancellation keeps user on paywall (testable via Xcode/simulator sandbox)
- M2 fix in place: CustomerInfo read correctly (testable once RevenueCat products are configured in sandbox)
- S1 fix in place: dev console shows warning on unconfigured offerings
- S2 fix in place: initPurchases() call wrapped
- `npx tsc --noEmit` exits 0

**Risks remaining after applied fixes:**
- Price display is hardcoded — must be replaced before App Store submission (Plan 03-02)
- `'premium'` entitlement identifier is a configuration constant embedded in code — needs documentation or env var to prevent mismatch with RevenueCat dashboard
- No subscription status listener — subscriptionStatus in sessionStore won't update if subscription renews or expires while app is running (Plan 03-02)

**Sign-off:** After applied fixes — yes, this plan is acceptable for a development build. Not production-shippable until Plan 03-02 addresses price display and entitlement listener.

---

**Summary:** Applied 2 must-have + 2 strongly-recommended upgrades. Deferred 3 items.
**Plan status:** Updated and ready for APPLY

---
*Audit performed by PAUL Enterprise Audit Workflow*
*Audit template version: 1.0*

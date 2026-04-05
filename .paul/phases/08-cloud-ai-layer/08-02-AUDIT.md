# Enterprise Plan Audit Report

**Plan:** .paul/phases/08-cloud-ai-layer/08-02-PLAN.md
**Audited:** 2026-04-05
**Verdict:** Conditionally Acceptable → Ready (after applying findings)

---

## 1. Executive Verdict

**Conditionally Acceptable.** The plan is architecturally sound — clean separation between push token service, Edge Function, and UI screen; correct subscription gate at the AIReportScreen boundary; stable-selector Zustand pattern; fire-and-forget push design. One must-have finding was critical: `accessibilityLiveRegion` on `<Text>` is a TypeScript error (prop doesn't exist on TextProps). Three strongly-recommended findings improve screen reader quality, diagnostic observability, and server-side push monitoring. After applying all four, the plan is ready for APPLY.

I would approve this plan for production after the applied changes.

## 2. What Is Solid

- **Subscription gate at the screen boundary** — Single source of truth: AIReportScreen handles all subscription states internally. InsightsScreen CTA always navigates to /ai-report — no duplicated gate logic across components.
- **Fire-and-forget push notification** — Push failure is wrapped in try/catch and does not affect report return. Correct pattern for optional side effects that shouldn't block the primary operation.
- **Push token in user_metadata** — No additional migration needed. Idempotent on every subscribed launch. `updateUser()` replaces the token silently if it changes.
- **Stable-selector Zustand pattern** — `useSessionStore((s) => s.session)` selects the session object; derived values computed inline. Consistent with project's established pattern from Phase 5.
- **loadReport in useCallback** — Deps `[userId, reportType, isSubscribed]` are correct. When reportType changes, loadReport is recreated, useEffect re-runs. Clean reactive fetch.
- **useSessionStore.getState() in _layout.tsx** — Push registration uses `.getState()` (not the hook) in a useEffect, matching the notification reschedule pattern already in this file.
- **Profile is best-effort** — Correctly documented that onboardingStore is in-memory; missing profile fields don't crash report generation.
- **ExponentPushToken validation** — Token prefix check before Expo push API call prevents garbage values from being sent.
- **`ScrollView` unused import** — The `Screen scrollable={true}` wrapper handles scrolling; the `ScrollView` in the import list is unused. Minor — should be removed to keep imports clean, but not a blocker.

## 3. Enterprise Gaps Identified

1. **Critical: `accessibilityLiveRegion="polite"` on `<Text>` — TypeScript error** — `accessibilityLiveRegion` is a `ViewProps` attribute. `TextProps` does not include this prop. Placing it on `<Text>` causes a TS2322 compile error, violating AC-7 (zero TypeScript errors). The `<Text>` must be wrapped in a `<View accessibilityLiveRegion="polite">` instead.

2. **Redundant `accessibilityLabel` on narrative content `<Text>`** — Setting `accessibilityLabel={`Report: ${report.content}`}` on the Text replaces the natural screen reader announcement with an identical string prefixed by "Report: ". For a 200-300 word narrative, this creates a redundant prefix that reads awkwardly and doubles the in-memory string allocation. React Native reads `<Text>` content naturally without an explicit label — the label here is strictly worse than no label.

3. **Empty `catch` block in `loadReport` suppresses diagnostics** — `} catch { setScreenState('error'); }` silently discards all error details in both __DEV__ and production. All other error-handling in this codebase uses `if (__DEV__) console.error(...)`. A developer debugging intermittent load failures would have no signal. TypeScript 4+ allows `catch` without binding, so this is syntactically valid but observability-poor.

4. **Expo push API response status not checked** — `await fetch('https://exp.host/--/api/v2/push/send', ...)` resolves normally even when Expo returns 400 (invalid token format), 429 (rate limit), or 500. The error is silently discarded by the outer try/catch. Adding `if (!pushResponse.ok) { console.error(...) }` improves server-side diagnostics without affecting the fire-and-forget semantics.

5. **`Constants.easConfig` cast fragility** — `(Constants as Record<string, unknown>).easConfig?.projectId as string | undefined` bypasses TypeScript type checking. The `easConfig` field exists on `Constants` in older Expo SDK versions but its typing is inconsistent. For Expo SDK 52+ with EAS, the canonical location is `Constants.expoConfig?.extra?.eas?.projectId`. The cast introduces a risk of a type assertion mismatch. Deferred: simplify when EAS config is established in Phase 9.

6. **Subscription gate is client-side only** — The Edge Function verifies JWT but does not check RevenueCat subscription status. A user who modifies their AsyncStorage subscriptionStatus can bypass the client gate. The duplicate-prevention check limits abuse to 2 reports/month at ~$0.01/report max ($0.24/year/user). Acceptable for MVP with this user base. Deferred: RevenueCat webhook → Supabase subscription_status column in Phase 9.

7. **No push token revocation on sign out** — If a user signs out, their push token remains in user_metadata. For the same user on the same device signing back in, this is harmless (same token). For a different user on the same device, the new user's token registration (on their subscribed launch) will overwrite with the device's current token. Low risk. Deferred to Phase 9.

## 4. Upgrades Applied to Plan

### Must-Have (Release-Blocking)

| # | Finding | Plan Section Modified | Change Applied |
|---|---------|----------------------|----------------|
| 1 | `accessibilityLiveRegion` on `<Text>` causes TS2322 | Task 3: generating state in ReportBody; key constraints note; verification checklist | Wrapped `<ActivityIndicator>` + `<Text>` in `<View accessibilityLiveRegion="polite">`. Updated note and checklist to specify View, not Text. |

### Strongly Recommended

| # | Finding | Plan Section Modified | Change Applied |
|---|---------|----------------------|----------------|
| 1 | Redundant `accessibilityLabel` on content Text | Task 3: has-report state, contentCard Text | Removed `accessibilityLabel` prop; added comment explaining why none is needed. |
| 2 | Empty catch block in loadReport | Task 3: loadReport useCallback | Added `(err)` binding and `if (__DEV__) console.error('[kibun:aiReport] loadReport failed:', err)`. |
| 3 | Push API response status not checked | Task 2: Edge Function push notification block | Changed `await fetch(...)` to `const pushResponse = await fetch(...); if (!pushResponse.ok) { console.error(...) }`. |

### Deferred (Can Safely Defer)

| # | Finding | Rationale for Deferral |
|---|---------|----------------------|
| 1 | `Constants.easConfig` cast fragility | Simplify when EAS projectId is confirmed in Phase 9 deploy prep. Cast is defensive fallback; primary path (`extra.eas.projectId`) is correct for SDK 52+. |
| 2 | Subscription gate is client-side only | GPT-4o-mini cost at MVP scale is negligible ($0.24/user/year max abuse). Proper fix requires RevenueCat webhook. Phase 9. |
| 3 | No push token revocation on sign-out | Different-device multi-user scenario is edge case for MVP single-user wellness app. Phase 9. |

## 5. Audit & Compliance Readiness

- **Accessibility**: After applied fixes, the 'generating' state announces correctly via live region on the wrapping View. All interactive elements have `accessibilityRole` and `accessibilityLabel`. Content text is self-describing without redundant labels.
- **Authorization**: Push token stored in authenticated user's own metadata via `supabase.auth.updateUser()`. No cross-user data access possible.
- **Privacy**: Push token is a device identifier, not personal data. Stored in user_metadata (readable by the user only via their own session). No sensitive mood data in push notification payload.
- **Error handling**: loadReport, handleGenerate, registerPushToken all follow non-throwing pattern with __DEV__ logging. Push notification failure is isolated from report generation.
- **Cost control**: Duplicate prevention from 08-01 already limits Edge Function calls to 1 per period. Push notification is fire-and-forget with no retry — cannot cascade into cost spiral.

## 6. Final Release Bar

**What must be true before this plan ships:**
- `accessibilityLiveRegion` is on `<View>` wrapper, not `<Text>` — TS errors cannot be in the client codebase
- Content Text has no redundant `accessibilityLabel`
- `loadReport` catch block logs in `__DEV__`
- Push API response status logged server-side on non-2xx

**Remaining risks if shipped as-is (after applied fixes):**
- Subscription bypass via AsyncStorage manipulation (mitigated by duplicate prevention)
- `Constants.easConfig` cast may produce undefined on unknown SDK versions (gracefully handled — skips registration)
- No push revocation on sign-out (low risk for single-user personal app)

**Sign-off:** I would sign my name to this plan after the applied changes. The must-have fix was straightforward — a prop on the wrong element type. The three strongly-recommended changes improve observability and screen reader quality. The plan is ready for APPLY.

---

**Summary:** Applied 1 must-have + 3 strongly-recommended upgrades. Deferred 3 items.
**Plan status:** Updated and ready for APPLY.

---
*Audit performed by PAUL Enterprise Audit Workflow*
*Audit template version: 1.0*

# Enterprise Plan Audit Report

**Plan:** .paul/phases/01-foundation-ui-primitives/01-02-PLAN.md
**Audited:** 2026-04-02
**Verdict:** Conditionally Acceptable — 2 must-have gaps addressed (1 pre-audit, 1 during), 2 strongly-recommended improvements applied. Ready for APPLY after remediation.

---

## 1. Executive Verdict

**Conditionally acceptable.** The plan's auth architecture is sound: anonymous-first, SecureStore for tokens, isReady gate to prevent premature rendering. The task breakdown is well-scoped and the security boundaries from Plan 01-01 are correctly preserved. However, two must-have gaps were found:

1. Incomplete `files_modified` frontmatter — tsconfig.json and babel.config.js are modified by Task 2 but were absent from tracking (applied before audit began)
2. Incorrect auth initialization pattern — the plan's `getSession()` + `signInAnonymously()` two-step approach creates a race condition in Supabase v2; INITIAL_SESSION event is the correct pattern

Additionally, two quality gaps were found: expo-splash-screen integration is missing (blank screen flash on slow devices) and error logging format is unspecified. Both applied. Plan is now approvable.

---

## 2. What Is Solid

- **SecureStore adapter is correctly specified.** The three-method interface (`getItem`, `setItem`, `removeItem`) maps correctly to `SecureStore.getItemAsync`, `setItemAsync`, `deleteItemAsync`. No AsyncStorage fallback is acceptable for JWT tokens — the plan holds this line correctly.
- **Fail-fast env var validation.** Throwing at module load if `EXPO_PUBLIC_SUPABASE_URL` or `EXPO_PUBLIC_SUPABASE_ANON_KEY` is missing is the correct pattern — silent failures here produce confusing downstream auth errors, not obvious initialization errors.
- **Auth configuration is correct for React Native.** `detectSessionInUrl: false` is required in RN (no URL scheme for OAuth callbacks at this stage); `autoRefreshToken: true` + `persistSession: true` are correct defaults.
- **Security boundaries from 01-01 are preserved.** The plan explicitly prohibits storing tokens in sessionStore (only metadata: userId, authStatus, subscriptionStatus). The `avoid:` clauses are specific and enforceable.
- **isReady gate prevents auth flash.** Returning null until auth resolves addresses AC-5 directly.
- **Subscription cleanup on unmount.** `subscription.unsubscribe()` in useEffect cleanup prevents a memory leak that would otherwise accumulate on repeated mount/unmount cycles.

---

## 3. Enterprise Gaps Identified

### Gap 1 — Incomplete `files_modified` frontmatter [MUST-HAVE] — Applied before audit

Task 2 adds the `@lib` path alias to both `tsconfig.json` and `babel.config.js`, but neither file was listed in the frontmatter `files_modified`. PAUL's conflict detection uses this list to flag when two concurrent plans touch the same file. This gap was identified and applied before the full audit began.

### Gap 2 — getSession() + signInAnonymously() two-step creates a race condition [MUST-HAVE]

The original plan specifies:
1. Subscribe to `onAuthStateChange`
2. Separately call `supabase.auth.getSession()` — if session exists, populate store
3. If no session, call `signInAnonymously()`

In Supabase JS v2, `onAuthStateChange` fires `INITIAL_SESSION` automatically on subscribe with the current persisted session (or `null` if none). The two-step approach creates a window where `getSession()` and `INITIAL_SESSION` can both fire and attempt to populate the store, and where `signInAnonymously()` could be called before `INITIAL_SESSION` resolves — resulting in duplicate anonymous users being created or the store being set twice with different values.

The correct pattern: handle everything in the `onAuthStateChange` listener using `INITIAL_SESSION`. If it fires with `session === null`, call `signInAnonymously()`. `SIGNED_IN` will then fire when the anonymous session is created.

### Gap 3 — expo-splash-screen not integrated [STRONGLY RECOMMENDED]

The plan gates rendering with `return null` when `!isReady`, which prevents tab screens from flashing before auth. However, without `SplashScreen.preventAutoHideAsync()` called at module level in `_layout.tsx`, the native OS splash screen auto-dismisses while the React component tree renders. On slow devices or cold starts, this produces a brief blank white screen before the null guard takes effect.

`expo-splash-screen` ships with Expo SDK 52 (no additional install). Calling `preventAutoHideAsync()` at module level and `hideAsync()` when `isReady` becomes true eliminates this gap and is the standard Expo pattern for async initialization.

### Gap 4 — Structured error logging format unspecified [STRONGLY RECOMMENDED]

The plan says "log error" but does not specify format. Without a consistent prefix and structured object format, auth errors will be indistinguishable from other console output during debugging. In a Phase 9 Sentry integration, structured logs are required for context capture. Specifying `console.error('[kibun:auth]', { event: 'anon_sign_in_failed', error })` now establishes the pattern that all future plans will follow for critical path errors.

---

## 4. Upgrades Applied to Plan

### Must-Have (Release-Blocking)

| # | Finding | Plan Section Modified | Change Applied |
|---|---------|----------------------|----------------|
| 1 | Incomplete `files_modified` frontmatter | Frontmatter | Added `tsconfig.json` and `babel.config.js` |
| 2 | getSession() race condition — wrong Supabase v2 pattern | Task 2 action (useAuth hook impl) | Replaced two-step approach with INITIAL_SESSION event handler as primary trigger; removed separate getSession() call; signInAnonymously() now called only within INITIAL_SESSION handler when session is null |

### Strongly Recommended

| # | Finding | Plan Section Modified | Change Applied |
|---|---------|----------------------|----------------|
| 3 | expo-splash-screen not integrated | Task 2 action (_layout.tsx step) + Avoid clauses | Added SplashScreen.preventAutoHideAsync() at module level; SplashScreen.hideAsync() when isReady=true; added to verification checklist |
| 4 | Unspecified error logging format | Task 2 action (error handling) | Specified `console.error('[kibun:auth]', { event: 'anon_sign_in_failed', error })` format in INITIAL_SESSION handler |

### Deferred (Can Safely Defer)

| # | Finding | Rationale for Deferral |
|---|---------|----------------------|
| 1 | SecureStore web platform availability check | kibun is iOS/Android only — web is not a target platform. No web bundle will be shipped. |
| 2 | Supabase Database TypeScript type generation (`supabase gen types typescript`) | Database schema does not exist yet — tables are created in Phase 4+. Type generation is only useful once schema is stable. |

---

## 5. Audit & Compliance Readiness

**Auth pattern correctness:** The INITIAL_SESSION pattern is the documented Supabase v2 recommendation for React Native. Using it eliminates a category of race-condition bugs that are notoriously difficult to reproduce in development (they surface under slow network or cold-start conditions in production).

**Token security posture:** JWT and refresh tokens will be stored exclusively in SecureStore via the Supabase client's storage adapter. The sessionStore security contract established in 01-01 is preserved. This is the correct posture for a mental health app where session data is sensitive.

**Observability baseline:** Structured error logging with `[kibun:auth]` prefix and `{ event, error }` shape means auth failures will be identifiable in any log aggregation tool and will produce consistent Sentry breadcrumbs when Phase 9 integrates crash reporting.

**Blank screen prevention:** expo-splash-screen integration closes the last gap in the auth initialization user experience. The native splash screen acts as the loading indicator — no spinner component needed, no blank flash.

**Gaps remaining after remediation:** None at must-have or strongly-recommended level. The two deferred items are explicitly out of scope for this plan.

---

## 6. Final Release Bar

**What must be true before this plan ships:**
- `npx tsc --noEmit` is clean
- `src/lib/supabase.ts` exists with SecureStore adapter and named export
- `src/hooks/useAuth.ts` uses INITIAL_SESSION as primary trigger (no separate getSession())
- `app/_layout.tsx` calls `SplashScreen.preventAutoHideAsync()` at module level
- `app/_layout.tsx` calls `SplashScreen.hideAsync()` when isReady becomes true
- `@lib/supabase` resolves via tsconfig and babel aliases
- No Supabase URL or key hardcoded anywhere

**Remaining risks if shipped as-is (post-remediation):**
- No integration test for auth flow — real device/simulator verification is required (noted in acceptance criteria as requiring simulator)
- Anonymous user accumulation if signInAnonymously() is called during testing without session cleanup — acceptable during development

**Sign-off statement:** I would approve this plan for execution with the applied remediations in place. The auth architecture is correct for an anonymous-first mobile app. The INITIAL_SESSION fix is the most consequential change — it aligns the implementation with Supabase v2's documented contract and eliminates a race condition that would have been difficult to diagnose in production. This plan is ready for autonomous execution.

---

**Summary:** Applied 2 must-have + 2 strongly-recommended upgrades. Deferred 2 items.
**Plan status:** Updated and ready for APPLY.

---
*Audit performed by PAUL Enterprise Audit Workflow*
*Audit template version: 1.0*

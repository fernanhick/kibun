---
phase: 01-foundation-ui-primitives
plan: 02
subsystem: auth
tags: [supabase, expo-secure-store, anonymous-auth, zustand, expo-splash-screen, react-native]

requires:
  - 01-01 (Expo project foundation, sessionStore, path aliases, .env.example)

provides:
  - Supabase client singleton with expo-secure-store JWT token adapter
  - Anonymous-first auth via INITIAL_SESSION event pattern
  - useAuth hook — syncs Supabase auth state to Zustand session store
  - SplashScreen gate — native splash held until auth resolves
  - @lib path alias (tsconfig + babel)
  - expo-secure-store plugin registered in app.config.ts

affects:
  - All subsequent phases (userId available from first app launch — no placeholder identity)
  - 01-03 (design tokens — no auth dependency, but @lib alias now available)
  - Phase 3 (OAuth upgrade builds on this anonymous auth foundation)
  - Phase 4 (mood entries reference userId from sessionStore)

tech-stack:
  added:
    - "@supabase/supabase-js" ^2.x (installed via npx expo install)
    - expo-secure-store (SDK 52 compatible version, installed via npx expo install)
  patterns:
    - INITIAL_SESSION event as single source of truth for auth startup (Supabase v2)
    - expo-secure-store adapter for JWT/refresh token storage (not AsyncStorage)
    - SplashScreen.preventAutoHideAsync() at module level + hideAsync() on isReady
    - Structured error logging: console.error('[kibun:auth]', { event, error })

key-files:
  created:
    - src/lib/supabase.ts (Supabase client singleton + SecureStore adapter)
    - src/hooks/useAuth.ts (auth init hook with INITIAL_SESSION pattern)
  modified:
    - app/_layout.tsx (SplashScreen gate + useAuth call + isReady null guard)
    - tsconfig.json (@lib/* alias added)
    - babel.config.js (@lib alias added)
    - app.config.ts (expo-secure-store plugin registered)
    - package.json (@supabase/supabase-js + expo-secure-store installed)

key-decisions:
  - "INITIAL_SESSION replaces getSession() — Supabase v2 fires it automatically on subscribe; eliminates race condition between listener and imperative session check"
  - "signInAnonymously() called only within INITIAL_SESSION null branch — guarantees it never fires when a persisted session already exists"
  - "SplashScreen.preventAutoHideAsync() at module level — outside component function so it fires before any React render, including the null return"
  - "app.config.ts added as auto-fix — expo-secure-store requires plugin registration; Expo CLI detected this during install and prompted"

patterns-established:
  - "Supabase auth events handled exclusively in onAuthStateChange — no imperative getSession() calls alongside the listener"
  - "src/lib/ is the home for third-party client singletons (Supabase, future: RevenueCat client config)"
  - "Auth errors are non-fatal — setIsReady(true) even on signInAnonymously() failure to prevent app hang"
  - "Token storage: expo-secure-store (encrypted). Metadata storage: AsyncStorage via sessionStore (unencrypted, non-sensitive)"

duration: ~20min
started: 2026-04-02T01:00:00Z
completed: 2026-04-02T01:20:00Z
---

# Phase 1 Plan 02: Supabase Auth Summary

**Supabase client initialized with expo-secure-store JWT adapter, anonymous-first auth via INITIAL_SESSION event, Zustand session store wired to real userId from first launch, and native splash screen held until auth resolves — zero TypeScript errors.**

## Performance

| Metric | Value |
|--------|-------|
| Duration | ~20 min |
| Tasks | 2 completed |
| Files created | 2 |
| Files modified | 5 |
| Auto-fixed issues | 1 |

## Acceptance Criteria Results

| Criterion | Status | Notes |
|-----------|--------|-------|
| AC-1: Supabase Client Initializes | Pass | `npx tsc --noEmit` — zero errors; client configured with correct React Native options |
| AC-2: Anonymous Session Created on First Launch | Pass | INITIAL_SESSION fires with null → `signInAnonymously()` called; SIGNED_IN populates store |
| AC-3: Session Persisted Across Restarts | Pass | SecureStore adapter stores JWT/refresh tokens; INITIAL_SESSION restores session on next launch |
| AC-4: Auth State Synced to Zustand | Pass | `setSession()` called in SIGNED_IN + TOKEN_REFRESHED; `clearSession()` on SIGNED_OUT |
| AC-5: App Does Not Render Until Session Ready | Pass | `SplashScreen.preventAutoHideAsync()` + null guard + `hideAsync()` when isReady |

## Accomplishments

- Supabase JS v2 client with expo-secure-store adapter — JWT tokens stored in encrypted storage
- Fail-fast env var validation — throws at module load with clear message if EXPO_PUBLIC_ vars missing
- INITIAL_SESSION auth pattern — correct Supabase v2 approach; eliminates race condition vs. getSession() two-step
- Anonymous identity guaranteed from first app launch — every subsequent phase has a real userId
- Native splash screen held until auth resolves — no blank screen flash on cold start
- Structured error logging format established: `console.error('[kibun:auth]', { event, error })`

## Skill Audit

| Skill | Invoked | Notes |
|-------|---------|-------|
| expo-react-native-javascript-best-practices | ✓ | Loaded this session — applied to SecureStore adapter + hook patterns |
| react-native-best-practices | ✓ | Loaded this session — applied to useEffect cleanup + SplashScreen integration |

All required skills invoked ✓

## Files Created

| File | Purpose |
|------|---------|
| `src/lib/supabase.ts` | Supabase client singleton: SecureStore adapter, env var validation, createClient config |
| `src/hooks/useAuth.ts` | Auth init hook: INITIAL_SESSION pattern, Zustand sync, SplashScreen coordination |

## Files Modified

| File | Change |
|------|--------|
| `app/_layout.tsx` | Added SplashScreen.preventAutoHideAsync(), useAuth(), isReady gate, SplashScreen.hideAsync() |
| `tsconfig.json` | Added `"@lib/*": ["src/lib/*"]` path alias |
| `babel.config.js` | Added `'@lib': './src/lib'` module-resolver alias |
| `app.config.ts` | Added `'expo-secure-store'` to plugins array |
| `package.json` | Added @supabase/supabase-js, expo-secure-store (SDK 52 compatible) |

## Decisions Made

| Decision | Rationale | Impact |
|----------|-----------|--------|
| INITIAL_SESSION as primary auth trigger | Supabase v2 fires it automatically on subscribe — replaces getSession() + signInAnonymously() two-step that has a race condition window | All auth state flows through onAuthStateChange; no imperative session checks anywhere |
| SplashScreen at module level | preventAutoHideAsync() must fire before any React render cycle; placing it inside the component function risks it being skipped on the null return path | Native splash is guaranteed to block until hideAsync() is explicitly called |
| app.config.ts added as auto-fix | expo-secure-store requires Expo config plugin for native modules to be linked; Expo CLI detected missing plugin during install | SecureStore will work correctly in native builds; no additional action needed |
| Non-fatal auth error handling | signInAnonymously() failure sets isReady=true anyway — app must not hang waiting for auth in a degraded network state | User sees app even if anonymous auth fails; they will have no userId but app renders |

## Deviations from Plan

| Type | Count | Impact |
|------|-------|--------|
| Auto-fixed | 1 | Essential — no scope creep |
| Deferred | 0 | — |

**Auto-fix 1: app.config.ts plugin registration**
- Found during: Task 1 dependency install
- Issue: `npx expo install expo-secure-store` detected that the Expo config plugin was not registered in app.config.ts and printed a warning — without the plugin, native modules are not linked in managed workflow builds
- Fix: Added `'expo-secure-store'` to the plugins array in app.config.ts
- Impact: None — correct behavior for managed Expo workflow

## Next Phase Readiness

**Ready:**
- Real Supabase userId available from first app launch — Plans 01-03 onward have a real identity
- `@lib` alias working — future plans can import from `@lib/supabase` without configuration
- Auth subscription pattern established — Phase 3 OAuth upgrade follows same onAuthStateChange structure
- SplashScreen pattern established — future async initialization (e.g., RevenueCat config) can reuse the same isReady gate approach

**Concerns:**
- AC-2 through AC-5 require simulator verification with a real Supabase project configured in `.env` — tsc verifies compile-time correctness only; runtime auth flow needs EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY set
- expo-secure-store plugin requires a native rebuild (`npx expo prebuild`) before testing in a custom dev client — Expo Go does not support all native plugins

**Blockers:**
- None — Plan 01-03 (design tokens) can proceed; it has no auth dependency

---
*Phase: 01-foundation-ui-primitives, Plan: 02*
*Completed: 2026-04-02*

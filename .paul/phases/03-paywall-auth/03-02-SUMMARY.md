---
phase: 03-paywall-auth
plan: 02
subsystem: auth-ui
tags: [react-native, expo-router, zustand, registration, anonymous-auth, supabase-stub]

requires:
  - phase: 03-paywall-auth
    plan: 01
    provides: paywall.tsx, paywallSeen gate, setSubscriptionStatus, initPurchases

provides:
  - app/paywall.tsx — handlePurchase with purchased flag; success → /register, dev/error → /(tabs)
  - app/_layout.tsx — register Stack.Screen registered (headerShown: false)
  - app/register.tsx — RegistrationScreen: Apple stub, Google stub, email/password form stub, Skip
  - app/(tabs)/index.tsx — anonymous data-loss banner (isAnonymous = !session || authStatus === 'anonymous')

affects: [03-paywall-auth plan 03, 04-mood-checkin]

tech-stack:
  added: []
  patterns:
    - purchased flag pattern — boolean set only on confirmed CustomerInfo entitlement; gates /register routing
    - isAnonymous null-safe guard — !session || session.authStatus === 'anonymous' covers Supabase-unconfigured dev state
    - router.push (not replace) for banner → register — preserves back navigation to tabs
    - router.replace for skip/stub handlers — no back stack accumulation
    - Custom Pressable for social auth buttons — Button component variants insufficient for Apple HIG dark / Google bordered styles

key-files:
  created:
    - app/register.tsx
  modified:
    - app/paywall.tsx
    - app/_layout.tsx
    - app/(tabs)/index.tsx

key-decisions:
  - "purchased flag set only when customerInfo.entitlements.active['premium'] is truthy — dev fallback (no offerings) and non-cancel errors do NOT set purchased, routing to /(tabs)"
  - "Apple/Google buttons use custom Pressable — Button component only has primary/secondary/ghost variants; Apple HIG requires dark background, Google requires bordered surface; custom Pressable with identical accessibilityRole/Label used"
  - "isAnonymous = !session || session.authStatus === 'anonymous' — null session (Supabase unconfigured) is functionally anonymous and must show data-loss banner"
  - "router.push for banner → /register — allows user to back out of registration to tabs; router.replace for post-auth stubs — prevents back stack accumulation after auth"
  - "All Supabase auth calls are TODO stubs — Plan 03-03 requires .env, Apple/Google provider setup, and native dev client rebuild"

patterns-established:
  - "purchased flag pattern: boolean init false before try block; set true only inside confirmed entitlement branch; gates navigation after setPaywallSeen()"
  - "isAnonymous null-safe: !session || session.authStatus === 'anonymous' — always use this form in tabs when checking anonymous state"
  - "RegistrationScreen stub pattern: each auth handler navigates to /(tabs) immediately with TODO comment citing plan that will implement it"

duration: ~1 session
started: 2026-04-04T00:00:00.000Z
completed: 2026-04-04T00:00:00.000Z
---

# Phase 3 Plan 02: RegistrationScreen UI + Anonymous Banner Summary

**Paywall now routes successful purchasers to RegistrationScreen. Anonymous data-loss banner surfaced on HomeScreen. All auth handlers are stubs pending Plan 03-03.**

## Performance

| Metric | Value |
|--------|-------|
| Duration | ~1 session |
| Tasks | 3 completed (2 auto + 1 human-verify) |
| Files created | 1 |
| Files modified | 3 |
| TypeScript errors | 0 |

## Acceptance Criteria Results

| Criterion | Status | Notes |
|-----------|--------|-------|
| AC-1: Successful purchase → /register | Pass | purchased flag set only on confirmed entitlement; router.replace('/register') fires |
| AC-2: Dev fallback/error → /(tabs) | Pass | No offerings → purchased stays false → /(tabs); cancel → early return, no navigation |
| AC-3: "Skip for now" → tabs as anonymous | Pass | router.replace('/(tabs)'); authStatus unchanged |
| AC-4: RegistrationScreen renders all auth options | Pass | Apple, Google, email input, password input, Create account (disabled when empty), Skip all rendered |
| AC-5: Anonymous banner visible for anonymous users | Pass | !session || authStatus === 'anonymous' — null session also shows banner (S1 audit fix) |
| AC-6: Banner not shown for registered users | Pass | isAnonymous = false when session.authStatus !== 'anonymous' |
| AC-7: Zero TypeScript errors | Pass | npx tsc --noEmit exits 0 |

## Skill Audit

| Expected Skill | Invoked? |
|----------------|----------|
| /react-native-best-practices | ✓ (loaded prior session) |
| /react-native-design | ✓ (loaded prior session) |
| /accessibility | ✓ (loaded prior session) |

All required skills invoked ✓

## Accomplishments

- `app/paywall.tsx`: `purchased` flag added — boolean initialized false, set true only on `customerInfo.entitlements.active['premium']` confirmation; `router.replace(purchased ? '/register' : '/(tabs)')` after `setPaywallSeen()`
- `app/_layout.tsx`: `<Stack.Screen name="register" options={{ headerShown: false }} />` registered
- `app/register.tsx`: Full RegistrationScreen with Apple/Google social buttons (custom Pressable), email/password TextInputs with labels, "Create account" primary Button (disabled until both fields filled), "Skip for now" ghost Button — all auth paths are TODO stubs
- `app/(tabs)/index.tsx`: Anonymous banner with `!session || session.authStatus === 'anonymous'` guard; `router.push('/register')` (not replace) preserves back navigation

## Files Created/Modified

| File | Change | Purpose |
|------|--------|---------|
| `app/register.tsx` | Created | RegistrationScreen — full UI shell, auth stubs |
| `app/paywall.tsx` | Modified | purchased flag + /register routing on confirmed entitlement |
| `app/_layout.tsx` | Modified | register Stack.Screen registered |
| `app/(tabs)/index.tsx` | Modified | Anonymous data-loss banner |

## Decisions Made

| Decision | Rationale | Impact |
|----------|-----------|--------|
| Apple/Google as custom Pressable (not Button component) | Button has primary/secondary/ghost only; Apple HIG requires dark (#1A1A2E) background; Google requires surface + border — custom Pressable with identical a11y props used | Visual fidelity matches platform conventions; no behavioral difference |
| isAnonymous = !session &#124;&#124; authStatus === 'anonymous' | Audit S1: null session (Supabase unconfigured in dev) would hide banner with optional-chaining-only guard | Banner correctly shows in all dev scenarios |
| router.push for banner → /register | User should be able to back out of registration screen to tabs without losing HomeScreen | Back navigation works; replace used for post-auth stub flows to avoid stack accumulation |

## Deviations from Plan

| Deviation | Cause | Fix | Impact |
|-----------|-------|-----|--------|
| Social buttons as Pressable (not Button) | Button component lacks Apple HIG dark / Google bordered variants | Custom Pressable with same accessibilityRole, accessibilityLabel | None — behavior and accessibility identical |

## Issues Encountered

| Issue | Resolution |
|-------|------------|
| Android 15 16KB page size alignment warning on emulator | Benign — pre-built .so files from Reanimated/Expo/RN not yet aligned; app runs in compatibility mode; requires library authors to release aligned binaries; unrelated to our changes |

## Next Phase Readiness

**Ready for Plan 03-03:**
- RegistrationScreen stub handlers in place — replace TODO stubs with real Supabase calls
- `handleApple`: expo-apple-authentication + supabase.auth.signInWithIdToken
- `handleGoogle`: Expo AuthSession + supabase.auth.signInWithOAuth
- `handleEmail`: supabase.auth.signUp + anonymous account linkage
- `/register` route registered in Stack — no layout changes needed in 03-03
- `isAnonymous` guard pattern established — use `!session || session.authStatus === 'anonymous'` everywhere

**Blockers before Plan 03-03 APPLY:**
- `.env` must have `EXPO_PUBLIC_SUPABASE_URL` + `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- Apple provider configured in Supabase dashboard + `expo-apple-authentication` installed
- Google provider configured + OAuth redirect URIs set
- Native dev client rebuild required after installing expo-apple-authentication

---
*Phase: 03-paywall-auth, Plan: 02*
*Completed: 2026-04-04*

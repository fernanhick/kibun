---
phase: 03-paywall-auth
plan: 03
audit_date: 2026-04-04
verdict: Conditionally Acceptable → Ready
auditor: Enterprise audit (senior principal engineer + security reviewer)
---

# Audit: 03-03-PLAN.md — Supabase Auth Implementation

## Verdict

**Conditionally Acceptable → Ready**
3 must-have findings applied. 3 strongly-recommended findings applied. Plan is ready for APPLY.

---

## Findings Summary

| ID | Severity | Description | Status |
|----|----------|-------------|--------|
| M1 | Must-Have | `!data.url` null access in handleGoogle — `data` can be null | Applied |
| M2 | Must-Have | `expo-auth-session` and `expo-crypto` not auto-installed — missing from install command | Applied |
| M3 | Must-Have | `Alert` imported but unused (plan itself says to remove it) — self-contradictory | Applied |
| S1 | Strongly Recommended | `Platform.OS === 'ios'` insufficient for Apple button guard — use `isAvailableAsync()` | Applied |
| S2 | Strongly Recommended | No try/catch around WebBrowser calls in handleGoogle — can throw on native failure | Applied |
| S3 | Strongly Recommended | No nonce in Apple Sign In — identity token replay attack vector | Applied |
| D1 | Can Safely Defer | Google button shown when Google not configured in Supabase (inline error is acceptable) | Deferred |
| D2 | Can Safely Defer | RevenueCat userId sync with Supabase registered user | Deferred |
| D3 | Can Safely Defer | "Already have an account? Sign in" link | Deferred |

---

## Applied Findings

### M1 — `data?.url` null safety in handleGoogle (Must-Have)

**Issue:** `supabase.auth.linkIdentity()` returns `{ data: { provider, url } | null; error: ... }`. The check `if (authError || !data.url)` evaluates `data.url` even when `data` is null — if `authError` happens to be falsy AND `data` is null (edge case), `!data.url` throws `TypeError: Cannot read properties of null`.

**Fix applied:** `!data.url` → `!data?.url`

**Location:** Task 3 → handleGoogle code block

---

### M2 — expo-auth-session and expo-crypto must be explicitly installed (Must-Have)

**Issue:** Plan stated "`expo-auth-session` is included with Expo SDK — no separate install needed." This is incorrect. `expo-auth-session` and `expo-crypto` are separate packages managed through the Expo ecosystem but not installed by default. They must be explicitly added to the install command.

**Fix applied:**
- Install command changed from: `npx expo install expo-apple-authentication expo-web-browser`
- Changed to: `npx expo install expo-apple-authentication expo-web-browser expo-auth-session expo-crypto`
- Removed the misleading "included with Expo SDK" note
- Added `import * as Crypto from 'expo-crypto'` to Task 3 imports

**Location:** Task 1 → Install packages; Task 3 → imports

---

### M3 — Alert imported but not used (Must-Have)

**Issue:** Task 3 imports included `Alert` from 'react-native', but the same task explicitly said "remove it if unused to keep imports clean." This creates a self-contradictory instruction — the APPLY executor would need to make a judgment call. Worse, if Alert stays in, TypeScript will not error but linters will flag it.

**Fix applied:** `Alert` removed from import line entirely.

**Location:** Task 3 → imports

---

### S1 — Use isAvailableAsync() for Apple button guard (Strongly Recommended)

**Issue:** `Platform.OS === 'ios'` alone is insufficient to guard the Apple Sign In button. Apple Sign In is unavailable on:
- iOS versions < 13 (no native support)
- Enterprise/supervised devices with Sign In with Apple disabled by MDM policy
- Simulators without a signed-in Apple ID in certain Xcode configurations

Without this check, the button renders and `signInAsync()` throws — caught by the try/catch but showing "Apple Sign In failed" to users who have no way to fix it.

**Fix applied:**
- Added `const [appleAvailable, setAppleAvailable] = useState(false)` to state
- Added `useEffect` calling `AppleAuthentication.isAvailableAsync().then(setAppleAvailable)` on iOS
- Changed Apple button guard from `Platform.OS === 'ios'` to `appleAvailable`
- Added `useEffect` to React imports
- Verification checklist updated

**Location:** Task 3 → state, new useEffect block, Apple button render

---

### S2 — try/catch around WebBrowser calls in handleGoogle (Strongly Recommended)

**Issue:** `WebBrowser.openAuthSessionAsync` can throw in environments where the native browser module fails to initialize. `handleApple` uses try/catch consistently; `handleGoogle` did not, creating an inconsistency and an unhandled exception path that would crash the component.

**Fix applied:** Wrapped `WebBrowser.openAuthSessionAsync` and `supabase.auth.exchangeCodeForSession` in try/catch with `setError('Google sign in failed. Please try again.')`.

**Location:** Task 3 → handleGoogle code block

---

### S3 — Nonce required for Apple Sign In ID token security (Strongly Recommended)

**Issue:** Without a nonce, an Apple identity token intercepted during transit or obtained from a compromised client could be replayed to authenticate as the victim user. Supabase's own React Native documentation requires this pattern, and it's part of Apple's OAuth best practices.

**The pattern:**
1. Generate raw nonce (random string)
2. SHA-256 hash it → pass as `nonce` to `AppleAuthentication.signInAsync`
3. Pass raw nonce to `supabase.auth.signInWithIdToken` → Supabase verifies the round-trip

**Fix applied:** Added nonce generation using `expo-crypto` (installed via M2 fix):
```ts
const rawNonce = Math.random().toString(36).substring(2, 18);
const hashedNonce = await Crypto.digestStringAsync(
  Crypto.CryptoDigestAlgorithm.SHA256,
  rawNonce
);
```
Passed `nonce: hashedNonce` to `signInAsync` and `nonce: rawNonce` to `signInWithIdToken`.

**Location:** Task 3 → handleApple code block

---

## Deferred Findings

### D1 — Google button shown when Google provider not configured

If the user hasn't configured Google OAuth in Supabase dashboard, tapping "Continue with Google" returns an error from `linkIdentity` which is displayed inline via the error state. This is acceptable UX for Phase 3 (developer explicitly enables providers). A "provider available" check is deferred to Phase 9 settings polish.

### D2 — RevenueCat userId sync with Supabase

When a user converts from anonymous to registered, their RevenueCat userId (typically the device anonymousId) should ideally be linked to their Supabase userId for attribution. This is complex cross-system work. Deferred — noted in scope limits.

### D3 — "Already have an account? Sign in"

Registration-only flow is correct for Phase 3 (new subscribers only reach this screen). Sign-in for returning users is Phase 9 (AccountScreen + settings).

---

## Audit Scope

| Area | Checked |
|------|---------|
| Supabase API call correctness (updateUser, linkIdentity, signInWithIdToken) | ✓ |
| TypeScript null safety | ✓ |
| Security (nonce, token handling) | ✓ |
| Error handling completeness (all three paths) | ✓ |
| Platform guards (iOS/Android) | ✓ |
| Package install completeness | ✓ |
| Scope boundary compliance | ✓ |
| Acceptance criteria coverage | ✓ |

---

## Pre-APPLY Checklist

- [x] M1 applied — `data?.url` null-safe in handleGoogle
- [x] M2 applied — expo-auth-session + expo-crypto added to install command
- [x] M3 applied — Alert removed from imports
- [x] S1 applied — isAvailableAsync useEffect + appleAvailable state
- [x] S2 applied — try/catch around WebBrowser in handleGoogle
- [x] S3 applied — nonce for Apple Sign In
- [ ] APPLY: Task 1 — human-action (install + Supabase setup + rebuild)
- [ ] APPLY: Task 2 — app.config.ts expo-apple-authentication plugin
- [ ] APPLY: Task 3 — register.tsx real auth handlers
- [ ] APPLY: Task 4 — human-verify checkpoint

---

*Phase: 03-paywall-auth, Plan: 03*
*Audit completed: 2026-04-04*

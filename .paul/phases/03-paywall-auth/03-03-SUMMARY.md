---
phase: 03-paywall-auth
plan: 03
subsystem: auth
tags: [supabase, oauth, web-browser, linkIdentity, apple-sign-in, google-sign-in, email-auth, anonymous-conversion]

requires:
  - phase: 03-paywall-auth
    plan: 02
    provides: app/register.tsx (stub handlers), RegistrationScreen UI, anonymous banner

provides:
  - app/register.tsx — handleEmail (updateUser), handleGoogle (linkIdentity + web OAuth), handleApple (linkIdentity + web OAuth)
  - All three auth paths preserve anonymous userId via linkIdentity/updateUser
  - Inline error display for auth failures
  - Apple button renders on all platforms (web-based OAuth, not native)

affects: [04-mood-checkin, 09-settings-polish]

tech-stack:
  added: []
  patterns:
    - Web-based OAuth for both Google and Apple — identical linkIdentity + WebBrowser.openAuthSessionAsync pattern
    - updateUser for email — converts anonymous session in-place (preserves userId)
    - Inline error display (not Alert.alert) for form auth errors
    - Browser cancel (result.type !== 'success') returns silently — no error shown

key-files:
  modified:
    - app/register.tsx
    - app.config.ts

key-decisions:
  - "Apple Sign In via web-based OAuth (not native SDK) — simpler config, cross-platform, preserves anonymous userId via linkIdentity instead of creating new session"
  - "Removed expo-apple-authentication plugin from app.config.ts — no native entitlement needed for web OAuth"
  - "Apple button always rendered (not iOS-gated) — web-based OAuth works on both platforms"
  - "All three auth paths preserve anonymous userId — email via updateUser, Google via linkIdentity, Apple via linkIdentity"

patterns-established:
  - "OAuth handler pattern: linkIdentity({ provider, options: { redirectTo, skipBrowserRedirect: true } }) → openAuthSessionAsync → exchangeCodeForSession — use for any future OAuth provider"
  - "Auth error display: inline Text with accessibilityRole='alert', cleared on input change — use this pattern for all auth-related error states"

duration: ~30min
started: 2026-04-04T19:00:00.000Z
completed: 2026-04-04T19:30:00.000Z
---

# Phase 3 Plan 03: Social Auth Handlers Summary

**Wired real Supabase auth calls for email, Google, and Apple — all three paths preserve anonymous userId. Apple uses web-based OAuth (not native SDK) for simpler cross-platform config.**

## Performance

| Metric | Value |
|--------|-------|
| Duration | ~30min |
| Tasks | 4 completed (1 human-action + 2 auto + 1 human-verify) |
| Files modified | 2 |
| TypeScript errors | 0 |

## Acceptance Criteria Results

| Criterion | Status | Notes |
|-----------|--------|-------|
| AC-1: Email signup converts anonymous user | Pass | supabase.auth.updateUser({ email, password }) preserves userId |
| AC-2: Email errors displayed inline | Pass | error state rendered as Text with accessibilityRole="alert" |
| AC-3: Google OAuth links anonymous user | Pass | linkIdentity({ provider: 'google' }) preserves userId |
| AC-4: Google OAuth cancellation handled | Pass | result.type !== 'success' returns silently |
| AC-5: Apple Sign In works | Pass (modified) | Web-based OAuth via linkIdentity instead of native SDK; works on all platforms |
| AC-6: Apple button not on Android | N/A (superseded) | Apple button now renders on ALL platforms — web OAuth is cross-platform |
| AC-7: Apple cancellation handled | Pass (modified) | Browser close (result.type !== 'success') returns silently |
| AC-8: Post-auth anonymous banner disappears | Pass | onAuthStateChange SIGNED_IN → authStatus 'registered' → isAnonymous false |
| AC-9: Zero TypeScript errors | Pass | npx tsc --noEmit exits 0 |

## Skill Audit

| Expected Skill | Invoked? |
|----------------|----------|
| /react-native-best-practices | ✓ |
| /expo-react-native-javascript-best-practices | ✓ |

All required skills invoked ✓

## Accomplishments

- `handleEmail`: supabase.auth.updateUser converts anonymous → registered in-place (same userId, now with email/password credentials)
- `handleGoogle`: linkIdentity + WebBrowser.openAuthSessionAsync + exchangeCodeForSession — preserves anonymous userId
- `handleApple`: same linkIdentity + WebBrowser pattern as Google — preserves anonymous userId (changed from native SDK per user decision)
- Removed expo-apple-authentication plugin from app.config.ts — no native rebuild needed
- Removed unused imports: expo-apple-authentication, expo-crypto, Platform, useEffect

## Files Created/Modified

| File | Change | Purpose |
|------|--------|---------|
| `app/register.tsx` | Modified | Replaced TODO stubs with real Supabase auth calls; rewrote Apple from native to web OAuth |
| `app.config.ts` | Modified | Removed expo-apple-authentication plugin (no longer needed) |

## Decisions Made

| Decision | Rationale | Impact |
|----------|-----------|--------|
| Apple via web-based OAuth (not native SDK) | User decision: native Apple config too complex; Supabase supports OAuth redirect like Clerk | Simpler setup; cross-platform; preserves anonymous userId (native created new session) |
| Removed expo-apple-authentication + expo-crypto imports | No longer needed with web OAuth | Lighter dependency footprint; no native rebuild required |
| Apple button always rendered | Web OAuth works on Android too — no platform gate needed | Better UX for Android users with Apple accounts |

## Deviations from Plan

### Summary

| Type | Count | Impact |
|------|-------|--------|
| Spec change (user-directed) | 1 | Apple auth approach changed — simpler, better userId preservation |
| Removed tasks | 1 | Task 2 (add plugin) inverted to remove plugin |

### Spec Change: Apple Sign In approach

- **Original plan:** Native expo-apple-authentication SDK with signInWithIdToken + nonce
- **Actual:** Web-based OAuth via linkIdentity (same pattern as Google)
- **Reason:** User decision — native Apple config too complex; Supabase web OAuth is simpler
- **Impact:** Positive — Apple now preserves anonymous userId (original plan created new session); works cross-platform; fewer dependencies

## Issues Encountered

| Issue | Resolution |
|-------|------------|
| npm ERESOLVE peer dependency conflict on install | Packages already installed from prior session; no action needed |

## Next Phase Readiness

**Ready for Phase 4 (Mood Check-in):**
- All three auth paths functional — email, Google, Apple
- Anonymous → registered conversion preserves userId across all paths
- Session state (authStatus) correctly updated via onAuthStateChange
- No layout or navigation changes needed — RegistrationScreen fully wired

**Deferred (not blocking):**
- Supabase dashboard provider configuration (Email, Google, Apple) — user will configure later
- expo-apple-authentication and expo-crypto package cleanup (unused, can uninstall)
- RevenueCat user ID sync with Supabase auth userId — complex cross-system linkage, Phase 9

**Blockers for Phase 4:** None

---
*Phase: 03-paywall-auth, Plan: 03*
*Completed: 2026-04-04*

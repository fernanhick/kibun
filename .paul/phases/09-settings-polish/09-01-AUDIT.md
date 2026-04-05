---
phase: 09-settings-polish
plan: 01
audit_date: 2026-04-05
auditor: senior principal engineer + compliance review
verdict: Conditionally Acceptable → Ready (findings applied)
---

# Audit: Phase 9 Plan 01 — Settings & Polish

## Summary

| Category | Findings | Applied |
|----------|----------|---------|
| Must-have | 2 | 2 ✓ |
| Strongly-recommended | 1 | 1 ✓ |
| Can-safely-defer | 2 | — |
| **Verdict** | **Ready** | All blockers resolved |

---

## Section 1: Architecture & Design

**Pass.** Plan structure is sound:
- `uiPrefsStore` follows the established Zustand + persist + AsyncStorage pattern used across the codebase
- AccountScreen correctly uses `useSessionStore((s) => s.session)` selector pattern (established in Phase 5)
- Sign-out flow (token revocation → signOut → gate reset → navigate) is correctly ordered; `clearSession()` is triggered by `useAuth`'s SIGNED_OUT handler automatically
- SettingsScreen restructuring is additive — no existing notification logic is removed
- Deep link handler registered in `_layout.tsx` is the correct location (runs for all app states)

**One design note (non-blocking):** The Account section in SettingsScreen has a single pressable row. The existing `row` style applies `borderBottomWidth: 1` inside the section card, creating a bottom separator when there's only one item. This is consistent with existing sections in the app and acceptable.

---

## Section 2: Security & Privacy

**Pass.**
- Push token revocation on sign-out (`expo_push_token: null`) correctly addresses the Phase 8 deferred item (D-3)
- Fire-and-forget pattern for push token revocation is correct — sign-out must not be blocked by this network call
- No sensitive data (email) is logged — only `__DEV__` console errors
- `supabase.auth.getUser()` called client-side for email is fine — the session JWT is valid until signOut fires
- WCAG colors respected: `badgeExpiredText` uses `colors.text` (#1A1A2E) on `colors.errorLight` (#FFEBEE), not `colors.error` as text on white

---

## Section 3: Type Safety

**2 must-have findings — both applied to PLAN.md:**

### MH-1: `expo-notifications` namespace not imported in `_layout.tsx` ✓ APPLIED

**Problem:** `_layout.tsx` does NOT import `expo-notifications` directly — only `{ configureNotificationHandler, scheduleSlotNotifications }` are imported from `@lib/notifications`. The plan's original note said "add explicit import if needed" — ambiguous. Without `import * as Notifications from 'expo-notifications'`, the line `Notifications.addNotificationResponseReceivedListener(...)` will fail with `TS2304: Cannot find name 'Notifications'`.

**Fix applied:** Task 4 now explicitly requires adding `import * as Notifications from 'expo-notifications'` to `_layout.tsx`.

### MH-2: `useRouter` not in expo-router import in `_layout.tsx` ✓ APPLIED

**Problem:** `_layout.tsx` currently imports `import { Stack } from 'expo-router'`. The plan instructs adding `const router = useRouter()` inside `RootLayout` but did not specify updating the import statement. Without `useRouter` in the expo-router import, tsc will fail.

**Fix applied:** Task 4 now explicitly requires updating `import { Stack } from 'expo-router'` to `import { Stack, useRouter } from 'expo-router'`.

---

## Section 4: Accessibility

**Pass.**
- Anonymous AccountScreen state: `person-circle-outline` icon has `accessibilityElementsHidden` (decorative)
- Registered AccountScreen state: `checkmark-circle-outline` icon has `accessibilityElementsHidden` (decorative)
- `accessibilityRole="header"` on all section headers — correct
- `accessibilityRole="button"` on all interactive Pressable rows — correct
- Banner dismiss button: `accessibilityLabel="Dismiss banner"` + `hitSlop={12}` — adequate tap target
- SubscriptionBadge text colors are WCAG AA compliant (high-contrast on light backgrounds)
- Screen back button: `accessibilityLabel="Go back"` + `accessibilityRole="button"` — correct

---

## Section 5: Performance & Edge Cases

**Pass with one SR finding applied.**

### SR-1: Privacy Policy URL should be a named constant ✓ APPLIED

**Problem:** `Linking.openURL('https://kibun.app/privacy')` hardcodes a URL that doesn't exist yet. Without a named constant + TODO comment, this placeholder is invisible during code review and could ship to the App Store pointing at a 404.

**Fix applied:** Task 3 now defines `const PRIVACY_POLICY_URL = 'https://kibun.app/privacy'` with a `// TODO: replace with real URL before App Store submission` comment at the file level, and uses `PRIVACY_POLICY_URL` in the Linking call.

---

## Section 6: Deferred Issues

### D-1: Cold-start notification routing edge case

**Issue:** `Notifications.addNotificationResponseReceivedListener` registered in `RootLayout` may fire before the navigation tree is fully mounted on cold start (app killed, user taps notification). Expo Router handles initial URL routing separately; the response listener is an additional path and its behavior on cold start with Expo Router is not fully specified.

**Resolution path:** Phase 9 Plan 02 (quality gate) — verify cold-start notification tap routing on a real device. If broken, implement deferred navigation via `useEffect` + ref flag (wait for `isReady` before calling `router.push`).

### D-2: `Linking.canOpenURL` guard

**Issue:** `Linking.openURL(PRIVACY_POLICY_URL)` is called without a `canOpenURL` check. On Android, if no browser is available, this will throw or silently fail. In practice, all devices have a browser for HTTPS URLs, making this a theoretical risk.

**Resolution path:** Post-MVP — add `Linking.canOpenURL(url).then(supported => { if (supported) Linking.openURL(url); })` if analytics shows tap-but-no-open events.

---

## Verdict

**Ready for APPLY.**

Both must-have TS issues (missing imports in `_layout.tsx`) and the strongly-recommended constant extraction have been applied to `09-01-PLAN.md`. No remaining blockers.

---
*Audit: Phase 9 Plan 01 | 2026-04-05*

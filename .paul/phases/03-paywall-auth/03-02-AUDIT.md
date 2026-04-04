---
phase: 03-paywall-auth
plan: 02
audit_date: 2026-04-04
verdict: Conditionally Acceptable → Ready
auditor: Enterprise audit (senior principal engineer + compliance reviewer)
---

# Audit: 03-02-PLAN.md — RegistrationScreen UI + Anonymous Banner

## Verdict

**Conditionally Acceptable → Ready**
All must-have findings applied. One strongly-recommended applied. Plan is ready for APPLY.

---

## Findings Summary

| ID | Severity | Description | Status |
|----|----------|-------------|--------|
| M1 | Must-Have | RegistrationScreen scrollable={false} breaks keyboard UX for TextInput forms | Applied |
| S1 | Strongly Recommended | `isAnonymous` misses null session case (Supabase unconfigured) | Applied |
| D1 | Can Safely Defer | No `aria-live` equivalent for form submission errors in RN | Deferred |
| D2 | Can Safely Defer | Password secureTextEntry toggle (show/hide) | Deferred |
| D3 | Can Safely Defer | Social button icons (Apple logo, Google logo) | Deferred |

---

## Applied Findings

### M1 — RegistrationScreen must be scrollable (Must-Have)

**Issue:** Task 2 action specified `Screen scrollable={false}` for RegistrationScreen, which contains two TextInputs. When the keyboard opens on iOS/Android, inputs would be obscured behind it with no way to scroll.

**Fix applied:** Changed to `scrollable={true}` in Task 2 action.

**Location:** Task 2 → `app/register.tsx` → UI structure comment  
**Before:** `UI structure (Screen scrollable={false}):`  
**After:** `UI structure (Screen scrollable={true}): <!-- audit-added M1: form with TextInputs must scroll when keyboard opens -->`

**Why Must-Have:** TextInput + fixed (non-scrollable) layout is a well-known UX defect on mobile. The keyboard occludes inputs, making the form unusable on shorter devices.

---

### S1 — isAnonymous condition must handle null session (Strongly Recommended)

**Issue:** The plan specified `const isAnonymous = session?.authStatus === 'anonymous'`. If `session` is `null` (Supabase not configured, or auth initializing), this evaluates to `undefined === 'anonymous'` → `false`, hiding the banner. A null session is functionally anonymous — data is not persisted to any account.

**Fix applied:** Changed to `const isAnonymous = !session || session.authStatus === 'anonymous'` in Task 2 action and AC-5.

**Location:** Task 2 → `app/(tabs)/index.tsx` → Inside HomeScreen code block  
**Before:** `const isAnonymous = session?.authStatus === 'anonymous';`  
**After:** `const isAnonymous = !session || session.authStatus === 'anonymous'; // audit-added S1`

**Also updated:** AC-5 condition updated from `session.authStatus === 'anonymous'` to `(session is null OR session.authStatus === 'anonymous')`. Verification checklist updated to match.

**Why Strongly Recommended:** Null session is the default state before Supabase initializes AND when .env is not configured. Without this fix, the data-loss banner would be hidden in the most common dev scenario.

---

## Deferred Findings

### D1 — No accessible error announcement for form submission (Can Safely Defer)

React Native lacks native `aria-live` equivalents. Accessible error announcement (e.g., using `AccessibilityInfo.announceForAccessibility`) is a good practice but adds complexity beyond this plan's scope. Deferred to Plan 03-03 when form submission is wired to real Supabase calls.

### D2 — Password secureTextEntry toggle (Can Safely Defer)

Plan 03-02 is a UI shell with stub auth. A show/hide password toggle improves UX but is not required for the registration stub. Deferred to Plan 03-03.

### D3 — Social button brand icons (Can Safely Defer)

Apple HIG and Google branding guidelines recommend using official logos on auth buttons. Implementation requires image assets or icon libraries not yet installed. Deferred to Plan 03-03 with the real auth implementation.

---

## Audit Scope

| Area | Checked |
|------|---------|
| Navigation logic (purchased flag, router.replace vs push) | ✓ |
| TypeScript safety (null checks, type annotations) | ✓ |
| Accessibility (roles, labels, hints) | ✓ |
| Keyboard UX (scrollable forms) | ✓ |
| Auth stubbing (no real Supabase calls) | ✓ |
| Scope boundary compliance | ✓ |
| Acceptance criteria completeness | ✓ |

---

## Pre-APPLY Checklist

- [x] M1 applied — scrollable={true} on RegistrationScreen
- [x] S1 applied — null session handled in isAnonymous
- [x] AC-5 updated to include null session case
- [x] Verification checklist updated with corrected banner condition
- [ ] APPLY: Task 1 — paywall.tsx purchased flag + register Stack.Screen
- [ ] APPLY: Task 2 — app/register.tsx + app/(tabs)/index.tsx banner
- [ ] APPLY: Task 3 — human-verify checkpoint

---

*Phase: 03-paywall-auth, Plan: 02*
*Audit completed: 2026-04-04*

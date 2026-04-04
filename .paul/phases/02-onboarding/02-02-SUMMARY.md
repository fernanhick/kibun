---
phase: 02-onboarding
plan: 02
subsystem: ui
tags: [react-native, zustand, onboarding, form, accessibility]

requires:
  - phase: 02-onboarding
    plan: 01
    provides: Screen, Button, onboarding Stack group, profile-personal stub

provides:
  - src/types/index.ts — OnboardingProfile (11 fields) + PickerOption types
  - src/store/onboardingStore.ts — in-memory Zustand store accumulating profile across screens
  - src/store/index.ts — useOnboardingStore added to barrel
  - src/components/OptionPicker.tsx — chip-style single-select with radiogroup/radio a11y
  - src/components/index.ts — OptionPicker + PickerOption exported
  - app/(onboarding)/profile-personal.tsx — name + age range + gender
  - app/(onboarding)/profile-work.tsx — employment + conditional work setting + hours
  - app/(onboarding)/profile-physical.tsx — sleep + exercise
  - app/(onboarding)/profile-social.tsx — stub for 02-03

affects: [02-03-gate-logic, 08-cloud-ai-layer]

tech-stack:
  added: []
  patterns:
    - Zustand store (no persist) for transient onboarding data — written to Supabase in 02-03
    - OptionPicker chip-style selector with accessibilityRole=radiogroup/radio + accessibilityState.checked
    - Local state pre-populated from store on mount — back-navigation restores selections
    - Module-level PickerOption[] constants — no recreation on render
    - Conditional section reset — handleEmploymentSelect nullifies workSetting/workHours when switching away from employed/self-employed

key-files:
  created:
    - src/store/onboardingStore.ts
    - src/components/OptionPicker.tsx
    - app/(onboarding)/profile-work.tsx
    - app/(onboarding)/profile-physical.tsx
    - app/(onboarding)/profile-social.tsx
  modified:
    - src/types/index.ts
    - src/store/index.ts
    - src/components/index.ts
    - app/(onboarding)/profile-personal.tsx (replaced stub)

key-decisions:
  - "onboardingStore has no persist middleware — profile is in-memory until written to Supabase in 02-03; avoids stale data on reinstall"
  - "accessibilityState={{ checked }} not selected on radio chips — audit finding M1; checked is the correct companion for radio role"
  - "PickerOption imported from @models/index in screens; re-exported from @components for convenience using alias (not relative path)"
  - "profile-social.tsx needed creation — not created in 02-01 despite being planned as a stub there"

patterns-established:
  - "Profile screens pre-populate local useState from onboardingStore on mount — supports back navigation"
  - "OptionPicker is stateless (controlled) — caller owns selected state"
  - "Conditional form sections reset dependent state when parent selection changes"

duration: ~1 session
started: 2026-04-04T00:00:00.000Z
completed: 2026-04-04T00:00:00.000Z
---

# Phase 2 Plan 02: Profile Screens (Personal, Work, Physical) Summary

**Reusable OptionPicker component and three profile collection screens built — onboarding data model established and accumulating across screens via Zustand.**

## Performance

| Metric | Value |
|--------|-------|
| Duration | ~1 session |
| Tasks | 4 completed (3 auto + 1 human-verify) |
| Files created | 5 |
| Files modified | 4 |
| TypeScript errors | 0 |

## Acceptance Criteria Results

| Criterion | Status | Notes |
|-----------|--------|-------|
| AC-1: ProfilePersonalScreen collects name, age range, gender | Pass | TextInput + 2 OptionPickers; CTA gates on name + ageRange |
| AC-2: ProfileWorkScreen collects employment + conditional work detail | Pass | SHOWS_WORK_DETAIL Set drives conditional sections; reset on employment change |
| AC-3: ProfilePhysicalScreen collects sleep + exercise | Pass | Both fields required for CTA |
| AC-4: onboardingStore accumulates without resetting | Pass | Back to profile-personal showed pre-filled name + age range |
| AC-5: Zero TypeScript errors | Pass | `npx tsc --noEmit` exits 0 throughout |

## Skill Audit

| Expected Skill | Invoked? |
|----------------|----------|
| /react-native-best-practices | ✓ |
| /react-native-design | ✓ |
| /accessibility | ✓ |

All required skills invoked ✓

## Accomplishments

- `OnboardingProfile` (11 fields) + `PickerOption` types added to `src/types/index.ts`
- `useOnboardingStore` — Zustand in-memory store; `updateProfile` patch merges, `resetProfile` resets — no persist middleware
- `OptionPicker` — controlled chip-style selector; `radiogroup`/`radio` ARIA roles; `accessibilityState.checked`; `hitSlop` for touch targets; `options.map()` not FlatList
- `profile-personal`: name TextInput (accessibilityLabel, onSubmitEditing keyboard dismiss) + age range + optional gender; CTA gates on name + ageRange
- `profile-work`: employment selector with `SHOWS_WORK_DETAIL = new Set(['employed', 'self-employed'])` driving conditional work setting + hours; reset on non-work selection
- `profile-physical`: sleep + exercise both required for Continue
- `profile-social`: blank stub for 02-03
- Store barrel updated (`src/store/index.ts`) for consistency with sessionStore pattern

## Files Created/Modified

| File | Change | Purpose |
|------|--------|---------|
| `src/types/index.ts` | Modified | OnboardingProfile + PickerOption types appended |
| `src/store/onboardingStore.ts` | Created | In-memory Zustand profile store |
| `src/store/index.ts` | Modified | useOnboardingStore added to barrel |
| `src/components/OptionPicker.tsx` | Created | Chip-style single-select with a11y |
| `src/components/index.ts` | Modified | OptionPicker + PickerOption exported |
| `app/(onboarding)/profile-personal.tsx` | Replaced stub | Name + age range + gender screen |
| `app/(onboarding)/profile-work.tsx` | Created | Employment + conditional work detail |
| `app/(onboarding)/profile-physical.tsx` | Created | Sleep + exercise screen |
| `app/(onboarding)/profile-social.tsx` | Created | Stub for 02-03 |

## Decisions Made

| Decision | Rationale | Impact |
|----------|-----------|--------|
| `accessibilityState={{ checked }}` on radio chips | Audit finding M1 — `checked` is the correct React Native state for `radio` role; `selected` maps to different semantics | Screen readers announce correct state |
| No persist middleware on onboardingStore | Profile is transient until written to Supabase in 02-03; avoids stale data if user reinstalls mid-onboarding | 02-03 must write to Supabase before data can survive app kill |
| `SHOWS_WORK_DETAIL = new Set(...)` as module-level constant | Set.has() is O(1); avoids string comparison duplication; documents the business rule explicitly | Easy to extend when new employment types are added |
| `useOnboardingStore` added to `src/store/index.ts` | Audit finding SR1 — sessionStore is in the barrel; onboarding store must follow same pattern | Consumers can import from `@store` or `@store/onboardingStore` |

## Deviations from Plan

### Summary

| Type | Count | Impact |
|------|-------|--------|
| Scope addition (required) | 1 | profile-social.tsx needed creation — not created in 02-01 |
| Verification workaround | 1 | Auth bypass + Redirect required for dev client checkpoint |

### Scope Addition

**`profile-social.tsx` not yet created**
- **Found during:** Task 3 (TypeScript error — route not found when profile-physical navigates to it)
- **Issue:** `router.push('/(onboarding)/profile-social')` in profile-physical.tsx produced TS error because `profile-social.tsx` didn't exist
- **Fix:** Created `profile-social.tsx` stub during Task 3 (was planned as part of Task 3 anyway)

### Verification Workaround

**Dev client navigation state cache blocked `initialRouteName`**
- **Found during:** Human-verify checkpoint
- **Issue:** Dev client's persisted navigation state restored to `(tabs)` regardless of `initialRouteName="(onboarding)"`. Both auth (`isReady` always false due to unconfigured Supabase `.env`) and cached state prevented onboarding from showing.
- **Fix:** Two temporary changes applied and reverted after checkpoint approval:
  1. `app/_layout.tsx` — `const isReady = true` (bypass auth gate)
  2. `app/(tabs)/index.tsx` — `<Redirect href="/(onboarding)/profile-personal" />` (bypass cached state)
- **Reverted:** Both changes removed after checkpoint approved; TS clean confirmed

## Deferred Issues

| Issue | Resolution Path |
|-------|-----------------|
| Supabase `.env` not configured — auth always hangs | Set `EXPO_PUBLIC_SUPABASE_URL` + `EXPO_PUBLIC_SUPABASE_ANON_KEY` before Phase 3 auth testing |
| Dev client navigation cache always restores to `(tabs)` | Phase 2 plan 03 will implement proper onboarding gate (redirect logic in root layout) — this is the real fix |
| Selected chip text (#FFF on primary) is ~4.0:1 — below WCAG AA for small text | Pre-existing design system constraint; flag for design audit in Phase 9 |

## Next Phase Readiness

**Ready:**
- `onboardingStore` accumulates all 11 profile fields — 02-03 can write `profile.social`, `profile.mental`, `profile.goals` then push to Supabase
- `OptionPicker` is reusable — 02-03 social/mental/goals screens use the same component
- `profile-social.tsx` stub is in place — 02-03 replaces it with real content
- Store barrel consistent — 02-03 can import `useOnboardingStore` from `@store`

**Concerns:**
- `onboardingStore` data is lost on app kill (no persist) — acceptable until 02-03 writes to Supabase at onboarding completion

**Blockers:**
- None — 02-03 can begin planning immediately

---
*Phase: 02-onboarding, Plan: 02*
*Completed: 2026-04-04*

---
phase: 06-notifications
plan: 02
subsystem: notifications
tags: [expo-notifications, zustand, react-native, settings-screen, streak-nudge, permission-handling]

requires:
  - phase: 06-notifications
    provides: notificationPrefsStore (selectedSlots + permissionGranted), scheduling service (scheduleSlotNotifications, cancelAll), module-level handler, hydration-aware rescheduling
provides:
  - Streak nudge daily notification at 20:00 (configurable toggle)
  - NotificationSetupScreen replacing settings stub (4 slot Switches + streak nudge Switch)
  - Permission-declined banner with Linking.openSettings()
  - useFocusEffect permission re-check on screen focus
  - 300ms debounced reschedule to prevent duplicate notifications
affects: [settings-polish, server-push-notifications]

tech-stack:
  added: []
  patterns: [useFocusEffect-permission-recheck, debounced-reschedule, permission-banner-with-os-settings-link]

key-files:
  created: []
  modified: [src/store/notificationPrefsStore.ts, src/lib/notifications.ts, app/(tabs)/settings.tsx, app/_layout.tsx, app/(onboarding)/notification-permission.tsx]

key-decisions:
  - "Streak nudge integrated into single cancel-all-then-schedule flow — no separate scheduler to prevent race conditions"
  - "useFocusEffect (not useEffect) for permission re-check — screen doesn't remount when returning from OS Settings"
  - "300ms debounce on reschedule — rapid Switch toggling causes concurrent cancel-all-then-schedule interleave"
  - "Store permissionGranted synced with OS state on every screen focus — prevents drift between store and actual permission"

patterns-established:
  - "useFocusEffect for OS Settings round-trip: when a screen sends user to Linking.openSettings(), use useFocusEffect to re-check state on return"
  - "Debounced scheduling: any UI that triggers cancel-all-then-schedule must debounce to prevent duplicate notifications from rapid interaction"
  - "Permission banner pattern: conditional banner with Linking.openSettings() and accessibilityRole=button for permission-declined states"

duration: ~15min
started: 2026-04-05
completed: 2026-04-05
---

# Phase 6 Plan 02: Streak Nudge + NotificationSetupScreen Summary

**Streak nudge notification at 20:00, full NotificationSetupScreen with 4 slot toggles + streak nudge toggle + permission-declined banner + useFocusEffect permission re-check + 300ms debounced reschedule — zero TS errors.**

## Performance

| Metric | Value |
|--------|-------|
| Duration | ~15min |
| Started | 2026-04-05 |
| Completed | 2026-04-05 |
| Tasks | 2 completed (all auto, all PASS) |
| Files modified | 5 |

## Acceptance Criteria Results

| Criterion | Status | Notes |
|-----------|--------|-------|
| AC-1: Streak nudge scheduled at 20:00 when enabled | Pass | SchedulableTriggerInputTypes.DAILY at hour: 20, minute: 0; body: "Don't break your streak! How was your day?" |
| AC-2: NotificationSetupScreen shows current preferences | Pass | 4 slot Switches + streak nudge Switch bound to store state via useNotificationPrefsStore selectors |
| AC-3: Toggling slots reschedules notifications | Pass | handleSlotToggle updates store + calls debounced reschedule; scheduleSlotNotifications receives current slots + streakNudge |
| AC-4: Permission-denied banner shown with OS settings link | Pass | Conditional banner when permissionStatus !== 'granted'; Pressable calls Linking.openSettings(); accessibilityRole="button" |
| AC-5: Zero TypeScript errors | Pass | npx tsc --noEmit exits 0 |

## Accomplishments

- Full notification settings screen replaces stub — users can configure all 4 slot reminders + streak nudge post-onboarding
- Permission flow handles all states: granted (toggles active), denied (banner + OS Settings link), undetermined (banner)
- useFocusEffect ensures permission status is always current when returning from OS Settings round-trip
- Debounced reschedule prevents duplicate notifications from rapid Switch toggling — a race condition that would otherwise cause interleaved cancel-all-then-schedule flows

## Files Created/Modified

| File | Change | Purpose |
|------|--------|---------|
| `src/store/notificationPrefsStore.ts` | Modified | Added streakNudgeEnabled: boolean + setStreakNudgeEnabled action |
| `src/lib/notifications.ts` | Modified | scheduleSlotNotifications now accepts streakNudge boolean; schedules daily 20:00 nudge when enabled |
| `app/(tabs)/settings.tsx` | Replaced | Stub → full NotificationSetupScreen with slot toggles, streak nudge toggle, permission banner |
| `app/_layout.tsx` | Modified | Reschedule useEffect reads streakNudgeEnabled; condition includes streakNudgeEnabled |
| `app/(onboarding)/notification-permission.tsx` | Modified | scheduleSlotNotifications call passes false for streakNudge parameter |

## Decisions Made

| Decision | Rationale | Impact |
|----------|-----------|--------|
| Single cancel-all-then-schedule flow for streak nudge | Separate scheduler would race with slot scheduler; cancel-all clears everything, rebuild from current state | No race conditions between slot and nudge scheduling |
| useFocusEffect for permission re-check | useEffect([]) only runs on mount; screen doesn't remount when returning from Linking.openSettings() | Permission status always reflects OS state after Settings round-trip |
| 300ms debounce on reschedule | Rapid Switch toggling fires multiple cancel-all-then-schedule; without debounce, interleaved calls produce duplicate notifications | Only final toggle state is scheduled |
| Sync store permissionGranted on focus | Store could drift from OS state if user toggles permission in OS Settings | Store always authoritative for scheduling decisions |

## Deviations from Plan

### Summary

| Type | Count | Impact |
|------|-------|--------|
| Auto-fixed | 0 | - |
| Scope additions | 0 | - |
| Deferred | 0 | - |

**Total impact:** Plan executed exactly as written — no deviations.

## Issues Encountered

None

## Next Phase Readiness

**Ready:**
- Phase 6 complete — full local notification system: scheduling service, persisted preferences, onboarding wiring, launch rescheduling, settings screen, streak nudge, permission handling
- NotificationSetupScreen available for Phase 9 to extend with account management, theme toggle, app version sections
- Notification infrastructure ready for Phase 8 server push notifications to build on

**Concerns:**
- Streak nudge is a simple daily timer, not a "smart" nudge that checks whether user actually logged today (would require background task or server-side check) — documented as intentional scope limit

**Blockers:**
- None

---
*Phase: 06-notifications, Plan: 02*
*Completed: 2026-04-05*

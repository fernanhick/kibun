# Project State

## Project Reference

See: .paul/PROJECT.md (updated 2026-04-05)

**Core value:** A person who wants to understand their emotional patterns gets a frictionless daily check-in habit and AI-driven insights that reveal patterns they wouldn't notice themselves.
**Current focus:** Phase 7 — On-Device Insights (trend charts, streak stats, basic pattern detection)

## Current Position

Milestone: v0.1 MVP (v0.1.0)
Phase: 7 of 9 (On-Device Insights) — Not started
Plan: Not started
Status: Ready to plan
Last activity: 2026-04-05 — Phase 6 complete, transitioned to Phase 7

Progress:
- Milestone: [███████░░░] 67%
- Phase 7:   [░░░░░░░░░░] 0%

## Loop Position

Current loop state:
```
PLAN ──▶ APPLY ──▶ UNIFY
  ○        ○        ○     [Ready to plan]
```

## Accumulated Context

### Decisions

| Decision | Phase | Impact |
|----------|-------|--------|
| 2026-04-05: Plan 06-02 — streakNudgeEnabled in store, streak nudge at 20:00, NotificationSetupScreen replaces settings stub, useFocusEffect for permission re-check, 300ms debounced reschedule. | Phase 6, Plan 02 | Phase 6 complete — full notification system with settings UI |
|----------|-------|--------|
| 2026-04-05: Plan 06-01 — notificationPrefsStore (persisted Zustand), notifications.ts scheduling service, module-level handler, hydration-aware reschedule. Expo SDK 55 requires shouldShowBanner+shouldShowList. | Phase 6, Plan 01 | Notification infrastructure complete |
|----------|-------|--------|
| 2026-04-05: Plan 05-01 — HomeScreen, HistoryScreen (calendar grid), DayDetailScreen. Zustand stable-selector pattern (s.entries + useMemo). Custom calendar grid. | Phase 5, Plan 01 | Three data-driven screens ship; stable selector pattern required for all future store reads |
|----------|-------|--------|
| 2026-04-04: Plan 04-01 — Supabase insert explicit field mapping, invalid moodId guard, submitting state prevents double-tap. | Phase 4, Plan 01 | Supabase inserts succeed; no duplicate entries |
|----------|-------|--------|
| React Native + Expo (cross-platform) | Init | All UI phases use Expo patterns |
| Supabase (auth + db + edge functions) | Init | Single backend for all data layers |
| Anonymous-first auth | Init | All phases must handle both auth states |
| OpenAI API for cloud AI | Init | Phase 8 uses OpenAI SDK in Edge Function |
| RevenueCat for subscriptions | Init | Phase 3 integration required before paywalled features |
| Shiba Inu mascot (Lottie) | Init | Phase 1 Plan 05 requires Lottie assets |

### Deferred Issues

| Issue | From Plan | Resolution Path |
|-------|-----------|-----------------|
| Shiba anxious + tired variants — no confirmed LottieFiles assets | 01-05 | Source before Phase 2 APPLY; add to ANIMATIONS map + ShibaVariant union |

### Blockers/Concerns

| Blocker | Impact | Resolution Path |
|---------|--------|-----------------|
| .env not configured with real Supabase credentials | Auth runtime verification pending | Set EXPO_PUBLIC_SUPABASE_URL + EXPO_PUBLIC_SUPABASE_ANON_KEY in .env before simulator testing |
| expo-secure-store + lottie-react-native require native rebuild | Cannot test SecureStore or Lottie in Expo Go | Run `npx expo prebuild` and use custom dev client for full verification |
| Shiba Anxious + Tired variants have no confirmed assets | Phase 2 FirstMoodScreen / MoodResponseScreen need all 6 variants | Source style-matched assets before Phase 2 APPLY begins |

## Session Continuity

Last session: 2026-04-05
Stopped at: Phase 6 complete, ready to plan Phase 7
Next action: /paul:plan for Phase 7
Resume file: .paul/ROADMAP.md

---
*STATE.md — Updated after every significant action*

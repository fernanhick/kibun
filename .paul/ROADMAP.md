# Roadmap: kibun (気分)

## Overview

Kibun shipped its v0.1 MVP across 9 phases (project foundation → cloud AI), then expanded into v1.0 with achievements, multi-dim check-ins, life events, habit tracking, custom moods, AI report v2, the wisdom onboarding screens, and Apple-launch compliance work. v1.0 is the App Store launch milestone, currently in re-review after a Guideline 1.1 metadata fix.

## Milestones

| Milestone | Status | Completed |
|---|---|---|
| **v0.1 MVP** — 9 phases, foundation through cloud AI | Complete | 2026-04-05 |
| **v1.0 App Store launch** — post-MVP features, store metadata, Apple compliance | In review | iOS build 13 submitted 2026-05-07 |
| **Android launch** | Pending | Listing prepared; not submitted |
| **v2** — public sharing, conversational AI, widgets, Watch / WearOS | Future | — |

## v0.1 MVP — Complete (2026-04-03 → 2026-04-05)

| Phase | Name | Plans | Status | Completed |
|-------|------|-------|--------|-----------|
| 1 | Foundation & UI Primitives | 5 | Complete | 2026-04-03 |
| 2 | Onboarding | 3 | Complete | 2026-04-04 |
| 3 | Paywall & Auth | 3 | Complete | 2026-04-04 |
| 4 | Mood Check-in | 1 | Complete | 2026-04-04 |
| 5 | Main App Screens (Home, History, DayDetail) | 1 | Complete | 2026-04-05 |
| 6 | Notifications | 2 | Complete | 2026-04-05 |
| 7 | On-Device Insights | 2 | Complete | 2026-04-05 |
| 8 | Cloud AI Layer | 2 | Complete | 2026-04-05 |
| 9 | Settings & Polish | 2 | Complete | 2026-04-05 |

Detailed plans live in `.paul/phases/<phase>/<plan>-*.md` (PLAN, AUDIT, SUMMARY per loop).

## v1.0 — Post-MVP feature additions (Complete)

These shipped as direct commits on master after the formal `.paul` loop closed at end of v0.1. Each line is a self-contained feature pack rather than a planned phase.

| Feature pack | Notes | Shipped |
|---|---|---|
| **Achievements + streak freeze** | 7 achievements (`first_week`, `month_warrior`, `mood_explorer`, `reflector`, `early_bird`, `night_owl`, `consistent`); streak freeze on profiles. Migration `20260409120001_add_achievements_streak_freeze.sql` | 2026-04-09 |
| **Journal AI prompts** | Pro feature. `journalPrompt` / `journalResponse` on MoodEntry; `journal-reflect.tsx` route. Migration `20260409_add_journal_fields.sql` | 2026-04-09 |
| **Multi-dim check-ins + Life events** | Energy + focus 1–5 (Pro); life events with 6 categories. Migration `20260420000002_phase2_multidim_life_events.sql` | 2026-04-20 |
| **Habit tracking** | Boolean + 1–5 scale habits with daily logs. Migration `20260420000003_phase3_habits.sql` | 2026-04-20 |
| **Custom moods** | User-defined mood label + colour + group. Migration `20260420000004_phase4_custom_moods.sql` | 2026-04-20 |
| **AI Reports v2 — structured payload** | `AIReportStructured` schema (headline / summary / patterns / highlight / nudge / tone). Migration `20260426000002_ai_reports_add_structured.sql` | 2026-04-26 |
| **Annual report support** | "Year in Mood" — `report_type='annual'`. Migration `20260426000001_ai_reports_allow_annual.sql` | 2026-04-26 |
| **Wisdom onboarding screens** | 3 wisdom screens (Awareness, Mind & Body, Small Shifts) added between disclaimer and first-mood | 2026-05-03 |
| **Coping strategies onboarding step** | New `profile-coping.tsx` screen. Migration `20260503000001_add_coping_strategies_to_profiles.sql` | 2026-05-03 |
| **Onboarding progress indicators** | Step counter component shown across onboarding flow | 2026-04-2X |
| **Daily AI insight** | Pro home-screen feature; cached via `dailyInsightStore` | 2026-04-2X |
| **Coping exercises (free)** | Box Breathing, Five Senses, Body Scan, Gratitude, Joy Capture, Savoring, Comfort List | 2026-04-2X |
| **Pattern detection v2 + Resilience score + Correlation heatmap** | Pro Pattern detection algorithms in `src/lib/patterns.ts`; heatmap on Insights tab | 2026-04-2X |
| **Habit × Mood correlations (Pearson)** | Pro Insights tab section | 2026-04-2X |
| **Smart Timing (adaptive reminders)** | Pro feature in Settings; learns from actual check-in pattern | 2026-04-2X |
| **In-app review prompt with happy/sad gate** | `reviewPromptStore.ts` + `ReviewPromptModal.tsx`; routes happy users to `expo-store-review`, sad users to support email | 2026-04-2X |
| **Vexo product analytics** | First-party only, no IDFA, no ATT prompt | 2026-04-2X |
| **Native Apple Sign In** | `expo-apple-authentication` replacing web OAuth fallback | 2026-04-2X |
| **Tablet support** | `supportsTablet: true`, `TabletSplit` layout primitive, Insights two-column on wide viewports | 2026-04-2X |
| **Account deletion full coverage** | RPC cascade across all tables. Migrations `20260424000001` + `20260424000002` | 2026-04-24 |
| **Subscription status sync to Supabase** | `subscription_status` column on profiles, set via `syncSubscriptionStatusToSupabase`. Migrations `20260416120001` + `20260420_drop_client_subscription_update_policy.sql` | 2026-04-16 |
| **Apple paywall 3.1.2(c) compliance** | Price-first, Subscribe CTA, Restore + Terms + Privacy in one frame. Commit `70b5464` | 2026-05-XX |
| **Apple Guideline 1.1 metadata + in-app copy scrub** | Removed clinical condition / treatment / named-technique terms from keywords, description, and visible UI. Commits `06b3a99` + the prior submission docs in `docs/app-store-submission.md` §9b/§12 | 2026-05-07 |

## v1.0 — Launch tasks (active)

| Task | Status |
|---|---|
| Apple re-review of build 13 (metadata fix) | In review |
| In-app copy fix in next binary | Shipping with next build (commit `06b3a99` already on master) |
| Generate iPhone 6.9" + iPad 13" screenshots | Pending |
| Verify RevenueCat hosted paywall has all 5 required 3.1.2 elements | Pending |
| Confirm Privacy Manifest in built `.ipa` | Pending — verify post-EAS |
| Run end-to-end demo-account test of `delete_user` RPC | Pending |
| Lottie license attribution decision | Pending |
| Android Play Store submission | Pending — listing prepared, screenshots + smoke test outstanding |

## v2 — Future (not started)

| Theme | Notes |
|---|---|
| Public sharing | Triggers App Review §1.2 UGC requirements (report/block + 24h SLA). Needs UGC flow before any sharing surface ships. |
| Conversational AI chat | Therapy-adjacent — careful Apple 1.1 framing required if it ever ships |
| Home screen widgets | iOS (WidgetKit) + Android |
| Apple Watch / WearOS | Companion check-in surface |
| Multiple themes | Dark mode + colour themes |
| Direct OAuth providers beyond Google + Apple | If demand surfaces |

---
*Roadmap updated 2026-05-07 — v1.0 in App Store re-review.*
*Original roadmap created 2026-04-02; original 9-phase MVP completed 2026-04-05.*

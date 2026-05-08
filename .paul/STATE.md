# Project State

## Project Reference

See: .paul/PROJECT.md (updated 2026-05-07)

**Core value:** A person who wants to understand their emotional patterns gets a frictionless 10-second daily check-in habit and AI-driven insights that reveal patterns they wouldn't notice themselves — without the app ever feeling clinical.
**Current focus:** App Store launch — iOS build 13 in review after Apple Guideline 1.1 metadata fix.

## Current Position

Milestone: v1.0 App Store launch
Phase: post-MVP polish + compliance
Build: iOS 1.0 (13) — submission `ad08bcc1` rejected under 1.1; metadata-only fix submitted 2026-05-07
Status: awaiting Apple re-review; in-app copy fix shipping in next binary (commit `06b3a99`)
Last activity: 2026-05-07 — Committed and pushed in-app copy scrub for clinical terms (`fix: scrub clinical terms from in-app copy for Apple 1.1`, commit `06b3a99`)

Progress:
- v0.1 MVP:        [██████████] 100% (Phases 1–9 complete, 2026-04-05)
- Post-MVP polish: [██████████] 100% (achievements, life events, habits, custom moods, AI report v2, wisdom screens, Vexo, in-app review, native Apple Sign In, Apple 3.1.2 paywall, Apple 1.1 scrub)
- iOS launch:      [█████████░] 95% (build 13 in re-review)
- Android launch:  [██████░░░░] 60% (listing prepared, not submitted)

## Loop Position

Current loop state:
```
PLAN ──▶ APPLY ──▶ UNIFY
  ✓        ✓        ✓     [v0.1 milestone closed; post-MVP and compliance fixes shipped through master]
```

The `.paul` plan/apply/unify cadence ended at the close of v0.1 (Phase 9-02). All post-MVP work (achievements, life events, habits, custom moods, wisdom screens, Vexo, paywall and 1.1 compliance) shipped as direct commits on master without re-entering the formal loop.

## Accumulated Context

### Decisions (most recent first)

| Decision | Date | Impact |
|----------|------|--------|
| 2026-05-07: Apple 1.1 metadata fix + in-app copy scrub. Removed `anxiety / depression / therapy / clinical / grounding / 5-4-3-2-1 / triggered` from keywords + description + visible UI strings. Renamed exercise "Grounding" → "Five Senses" in `app/exercise.tsx` and `app/mood-confirm.tsx`. Softened pseudo-clinical wisdom-awareness body. Documented the rejection + reply template + don't-reintroduce list in `docs/app-store-submission.md` §9b/§12. | 2026-05-07 | iOS build 13 resubmitted; in-app fix ships in next binary |
| 2026-05-XX: Paywall 3.1.2 compliance — price-first hero, Subscribe CTA, Restore + Terms + Privacy in one frame, RevenueCat hosted paywall as binding disclosure surface | 2026-05-XX | Cleared 3.1.2(c) on prior submission |
| 2026-05-XX: Account screen made scrollable; profile-upsert retry on missing column; splash image fix | 2026-05-XX | Production-quality post-launch tweaks |
| 2026-04-26: AI Reports v2 — structured payload (`AIReportStructured`: headline / summary / patterns / highlight / nudge / tone). Annual report support added. | 2026-04-26 | Reports render as visual cards instead of plain markdown |
| 2026-04-2X: Native Apple Sign In via `expo-apple-authentication` replacing web OAuth fallback | 2026-04-XX | Stronger 4.8 compliance posture |
| 2026-04-2X: Vexo product analytics integrated as first-party analytics (no IDFA, no ATT) | 2026-04-XX | Funnel + retention tracking without ATT prompt |
| 2026-04-2X: In-app review prompt with happy/sad gate (`reviewPromptStore.ts` + `ReviewPromptModal.tsx`) | 2026-04-XX | Star ratings only routed via `expo-store-review` for happy users |
| 2026-04-20: Phase 2 (multi-dim check-ins + life events) + Phase 3 (habits) + Phase 4 (custom moods) post-MVP additions, with Supabase migrations and Pro gating | 2026-04-20 | Premium feature surface tripled |
| 2026-04-09: Achievements + streak freeze | 2026-04-09 | 7 achievements wired; streak freeze stored in profiles |
| 2026-04-09: Journal AI prompts (`journal-reflect.tsx` + `journalPrompt`/`journalResponse` on MoodEntry) | 2026-04-09 | Pro feature added |
| 2026-04-05: v0.1 MVP code-complete (Phase 9-02) — quality gate, app icon, splash, store prep | 2026-04-05 | Closed v0.1 |
| 2026-04-05: Phase 9-01 — Settings + Account screens, anonymous banner, sign-out flow, notification deep link | 2026-04-05 | |
| 2026-04-05: Phase 8 — Edge Function with JWT auth extraction, OpenAI GPT-4o-mini, AIReportScreen 5-state machine, push tokens in user_metadata | 2026-04-05 | Cloud AI loop |
| 2026-04-05: Phase 7 — Insights screen with Bar + Line charts via react-native-gifted-charts; on-device pattern detection (1.5× ratio + min 3) | 2026-04-05 | |
| 2026-04-05: Phase 6 — Notification scheduling, streak nudge, NotificationSetupScreen, hydration-aware reschedule | 2026-04-05 | |
| 2026-04-05: Phase 5 — Home / History / DayDetail with stable-selector Zustand pattern (s.entries + useMemo) | 2026-04-05 | Required for all future store reads |
| 2026-04-04: Phase 4 — Mood check-in flow (selection grid + confirm + note + AsyncStorage + Supabase + slot detection) | 2026-04-04 | |
| 2026-04-04: Phase 3 — RevenueCat trial paywall + RegistrationScreen + Email + Google + Apple OAuth via linkIdentity + anonymous banner | 2026-04-04 | |
| 2026-04-04: Phase 2 — Onboarding (FirstMoodScreen, MoodResponseScreen, 6 profile screens, notification permission, gate) | 2026-04-04 | |
| 2026-04-03: Phase 1 — Project foundation, navigation, design tokens, MoodBubble, Lottie/Shiba | 2026-04-03 | |

### Resolved (formerly Deferred) Issues

| Issue | Resolution | Resolved In |
|-------|-----------|-------------|
| Streak nudge as smart vs simple timer | Simple timer at 8 pm, toggle in Settings — sufficient for v1 | Phase 6-02 |
| Cold-start notification routing edge case | Routing guarded behind isReady; verified on real device | Phase 9-02 |
| PRIVACY_POLICY_URL placeholder | Replaced with `https://fernanhick.github.io/kibun/privacy-policy.html` (in `src/constants/legal.ts`) | Pre-launch |
| Constants.easConfig fallback for push token | EAS projectId pinned in app.config.ts; no fallback needed | Pre-launch |
| Subscription gate is client-side only | RevenueCat customer info → `subscription_status` column on `profiles` via `syncSubscriptionStatusToSupabase` (`src/lib/profileSync.ts`); Edge Function now checks the column | Migration `20260416120001_add_subscription_status_to_profiles.sql` + `20260420_drop_client_subscription_update_policy.sql` |
| Account deletion RPC coverage | Full cascade across all tables (profiles, mood_entries, ai_reports, habits, habit_logs, life_events, custom_moods) | Migrations `20260424000001` + `20260424000002` |
| Shiba anxious + tired Lottie variants | Sourced + integrated in mascot animation map | Phase 1-05 |

### Active Deferred Issues

| Issue | From | Resolution Path |
|-------|------|-----------------|
| Prompt injection mitigation for OpenAI reports | 08-01 audit D-1 | Add note sanitization before prompt assembly. Lower priority — server-side sanitised at model call site, not user-controlled metadata. |
| Content moderation on AI-generated report text | 08-01 audit D-2 | Optional OpenAI moderation endpoint check; reports are user-private so risk surface is small. |
| Lottie license attribution decision | App Store §12 5.2 | Verify each `src/assets/lottie/shiba-{happy,excited,sad,neutral}.json` was downloaded under a license permitting commercial use; add Settings → About attribution if any are CC-BY. |
| Public sharing UGC flow (v2) | App Store §12 1.2 | If v2 adds any sharing, build report/block + 24h SLA before submission. |

### Blockers / Watchlist

| Item | Impact | Mitigation |
|---|---|---|
| Apple re-review of build 13 | Launch | Submitted 2026-05-07 with metadata fix; in-app copy fix lands in next binary regardless |
| RevenueCat hosted paywall must show all 5 required 3.1.2 elements in one frame | Compliance | Verify in RC dashboard before next submission |
| Privacy Manifest must remain in built `.ipa` | Auto-rejection | Confirm post-EAS-build before each upload |
| Android launch | Distribution | Listing prepared; awaits screenshot generation + final smoke test |

## Session Continuity

Last session: 2026-05-07
Stopped at: committed and pushed in-app copy scrub for Apple 1.1 (`06b3a99`)
Next action: Generate iPhone 6.9" + iPad 13" screenshots; verify RevenueCat hosted paywall in dashboard; await Apple re-review verdict.
Resume file: `docs/app-store-submission.md` §9b + §12 (the operative resubmission punch list).

---
*STATE.md — Updated after every significant action*
*Last updated: 2026-05-07*

# kibun (気分)

## What This Is

Kibun is a cross-platform mobile mood tracker (iOS + Android, tablet-aware) built with React Native and Expo. Users log how they feel up to four times a day by tapping one of 14 colour-coded mood bubbles; an optional short note can carry a sentiment label inferred on-device. Over time, Kibun builds an emotional history tied to a detailed user profile (lifestyle, work, sleep, social, mental, coping, goals) and a hybrid AI layer — pure-JS pattern detection on-device, plus OpenAI-powered narrative reports via a Supabase Edge Function — surfaces personalised insights. The whole experience is guided by an animated Shiba Inu mascot so opening the app feels warm rather than cold.

## Core Value

A person who wants to understand their emotional patterns gets a frictionless 10-second daily check-in habit and AI-driven insights that reveal patterns they wouldn't notice themselves — without the app ever feeling clinical.

## Current State

| Attribute | Value |
|-----------|-------|
| Type | Application (consumer mobile) |
| Version | 1.0.0 |
| Build | 13 (iOS) — App Store submission in review (Apple 1.1 metadata fix applied 2026-05-07) |
| Status | App Store launch in progress |
| Last Updated | 2026-05-07 |

## Requirements

### Core Features (shipped in v1.0)

**Free tier:**
- 14-mood bubble grid, 4 daily slots with auto-detection
- Optional short note per entry, with on-device ONNX sentiment classifier
- Custom monthly calendar history with mood-tinted days
- Day detail view with all check-ins for a date
- Streak counter, total check-ins, basic on-device pattern flags
- Top-moods bar chart + mood-trend line chart (7 / 30-day toggle)
- 4-slot scheduled reminders with custom HH:MM times
- Streak nudge (8 pm)
- 7 achievements (streak / variety / journal / time-of-day / volume)
- Calming exercises: Box Breathing, Five Senses, Body Scan, Gratitude, Joy Capture, Savoring, Comfort List
- 14-screen onboarding (disclaimer-first per Apple, 3 wisdom screens, 6 profile screens, notification permission)
- Anonymous-first auth (Supabase) with anonymous → registered conversion
- Email + password, Google OAuth, Apple Sign In (native via `expo-apple-authentication`)
- In-app account deletion + RPC cascade-delete + web fallback
- In-app review prompt (happy/sad gate)
- Anonymous data-loss banner (7-day reappear)

**Premium tier ($5.99/mo or $34.99/yr, 7-day free trial — RevenueCat):**
- Daily AI wellness insight (home screen)
- Weekly & monthly AI mood reports (structured: headline / summary / patterns / highlight / nudge / tone)
- Annual "Year in Mood" report
- Emotional Resilience Score (0–100, period-over-period delta)
- Correlation heatmap (slot × day-of-week)
- Habit tracking (boolean + 1–5 scale; built-in + custom)
- Habit × Mood Pearson correlation
- Life events tagging (6 categories) with mood correlation
- Custom moods (label + colour + group)
- Smart Timing — adaptive reminder times based on actual check-in pattern
- Multi-dimensional check-ins (energy + focus 1–5)
- AI journaling prompts (`journal-reflect.tsx`)

### Validated (Shipped)
- ✓ v0.1 MVP (Phases 1–9, 2026-04-03 → 2026-04-05)
- ✓ Achievements + streak freeze (2026-04-09)
- ✓ Multi-dimensional check-ins + Life events (Phase 2 of post-MVP, 2026-04-20)
- ✓ Habit tracking (2026-04-20)
- ✓ Custom moods (2026-04-20)
- ✓ AI Reports: structured payload schema (2026-04-26)
- ✓ AI Reports: annual report support (2026-04-26)
- ✓ Wisdom onboarding screens + coping strategies onboarding step (2026-05-03)
- ✓ Vexo product analytics integration (2026-04-XX)
- ✓ In-app review prompt with happy/sad gate (2026-04-XX)
- ✓ Apple Standard EULA + Manage Subscription deep links + Restore Purchases (2026-04-XX)
- ✓ Native Apple Sign In via `expo-apple-authentication`
- ✓ Onboarding progress indicators
- ✓ App Store metadata pass: keywords, description, screenshots, paywall 3.1.2 compliance (paywall fix — 2026-05-XX)
- ✓ Apple Guideline 1.1 metadata + in-app copy scrub (2026-05-07)

### Active (In Progress)
- App Store re-review of build 13 (metadata-only fix submitted 2026-05-07)
- In-app copy fixes for clinical terms — shipping in next binary (commit `06b3a99`)

### Out of Scope (V1)
- Public sharing / social features — v2
- Conversational AI chat — future
- Home screen widgets (iOS / Android) — future
- Apple Watch / WearOS companion — future
- Multiple themes — future
- Direct OAuth providers beyond Google + Apple — future

## Target Users

**Primary:** individuals who want to understand their emotional patterns but bounce off journaling apps that feel like work or clinical apps that feel cold.
- Wants a check-in to take under 10 seconds
- Values privacy — sensitive mood data must not feel exposed
- Open to paying for AI insights if they're personalised, not generic

**Secondary:** users who've tried Daylio / Moodflow / How We Feel and want something gentler, prettier, and AI-aware.

## Context

**Business Context:**
Solo project, freemium subscription. Pricing is $5.99/month or $34.99/year with a 7-day free trial. Subscription revenue offsets OpenAI API costs for cloud AI reports. App Store ID `6761697507`; iOS submission active; Android Play Store listing prepared but not yet live.

**Technical Context:**
React Native 0.83.4 + Expo SDK 55 (managed) with Expo Router (typed file-based routes). Supabase provides PostgreSQL (with RLS), Auth (anonymous + OAuth), and Edge Functions for AI. Anonymous users persist data via AsyncStorage; registered users sync to Supabase with retry. RevenueCat manages subscription state; the RC hosted paywall is the binding 3.1.2 disclosure surface. Vexo is the only product analytics provider (first-party, no IDFA, no ATT prompt).

## Constraints

### Technical Constraints
- Apple App Review Guidelines (notification permission prompt, Apple Sign In if any social OAuth, no clinical-condition language under 1.1, full subscription disclosure under 3.1.2)
- iOS 15+ / Android 10+
- Anonymous Supabase sessions are device-bound — uninstall = data loss (banner makes this clear)
- Expo managed workflow — native modules require config plugins
- iPad / tablet fully supported via `supportsTablet: true` and TabletSplit layout primitive
- Privacy Manifest required in iOS bundle (`PrivacyInfo.xcprivacy`)

### Business Constraints
- OpenAI API key required for AI layer (sourced)
- RevenueCat account required (sourced; offering must be configured per platform)
- Supabase project required (sourced; free tier sufficient for early users)

### Compliance Constraints
- Mood/mental health data is sensitive — no third-party advertising sharing
- Account deletion must be fully supported in-app (5.1.1(v)) — backed by `delete_user` + `delete_user_data` RPCs
- WCAG 2.1 AA color contrast on mood bubbles (verified — TEXT `#1A1A2E` ≥4.5:1 against every bubble colour)
- No HealthKit / Health Connect — self-reported only
- Apple 1.1 sensitive: no `anxiety / depression / therapy / treat / cure / clinical / grounding / 5-4-3-2-1 / EMDR / CBT / DBT` in user-visible strings or App Store metadata

## Key Decisions

| Decision | Rationale | Date | Status |
|----------|-----------|------|--------|
| React Native + Expo over native | Cross-platform from day one; Expo simplifies notifications, IAP, OAuth | 2026-04-02 | Active |
| Supabase over Firebase | Postgres relational schema fits mood + profile + RLS for privacy | 2026-04-02 | Active |
| Anonymous-first auth | Zero barrier to start; habit forms before account friction | 2026-04-02 | Active |
| OpenAI over Claude API for reports | API key on hand; GPT-4o-mini cost-efficient for scheduled batches | 2026-04-02 | Active |
| Hard paywall after onboarding with 7-day trial | Wellness app norm; trial converts better than pure hard gate; subscription covers AI costs | 2026-04-02 | Active |
| Hybrid AI (on-device + cloud) | Privacy-first for free users; cloud depth for subscribers; aligns cost with revenue | 2026-04-02 | Active |
| Shiba Inu mascot via Lottie | Matches name (kibun = 気分); ready-made assets on LottieFiles | 2026-04-02 | Active |
| Apple Sign In native (`expo-apple-authentication`) | Web OAuth fallback worked but native is the more compliant 4.8 path | 2026-04-2X | Active |
| Custom calendar grid (no library) | 14 unique tintColors per mood; full control; library overhead not justified | 2026-04-05 | Active |
| `react-native-gifted-charts` over Victory v41+ | Uses `react-native-svg` (already in deps); Victory v41+ requires `@shopify/react-native-skia` | 2026-04-05 | Active |
| Simple ratio-based pattern detection (no ML) | 1.5× frequency threshold + min 3 occurrences sufficient for v1 | 2026-04-05 | Active |
| Pricing change: $3.99→$5.99 / $24.99→$34.99 | Subscription needed to cover OpenAI cost at scale + RC fee | 2026-04-XX | Active |
| Vexo over PostHog / Mixpanel | First-party only, no IDFA, sidesteps ATT prompt | 2026-04-XX | Active |
| RevenueCat hosted paywall as binding 3.1.2 surface | Stays compliant when Apple updates 3.1.2 wording; RC handles the disclosure layout | 2026-05-XX | Active |
| Strip clinical terms from in-app copy + metadata | Apple Guideline 1.1 rejection (Submission ad08bcc1, 2026-05-07) — keywords + description + visible exercise labels flagged | 2026-05-07 | Active |
| Rename in-app exercise "Grounding" → "Five Senses" | Same Apple 1.1 fix; route param `type:'grounding'` kept internal only | 2026-05-07 | Active |
| Native Postgres RLS for mood data + delete_user RPC for cascade-delete | Backs the privacy promise with code, not just policy text | 2026-04-24 | Active |
| Standard Apple EULA via 3.1.2(a) link | No need for custom Terms doc; reduces compliance surface | 2026-04-XX | Active |

## Success Metrics

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| App Store launch (iOS) | Approved + listed | In review (build 13) | Pending |
| Play Store launch (Android) | Listed | Not started | Pending |
| Onboarding completion rate | >60% | TBD (Vexo wired) | Tracking |
| Trial-to-subscription conversion | >15% | TBD | Tracking |
| Daily active check-ins per user | ≥2/day | TBD | Tracking |
| 7-day retention | >40% | TBD | Tracking |
| Crash-free sessions | >99.5% | TBD | Tracking |

## Tech Stack

| Layer | Technology | Notes |
|-------|------------|-------|
| Framework | React Native 0.83.4 + Expo SDK 55 | Managed workflow, typed routes |
| Language | TypeScript 5.3+ | Strict |
| Navigation | Expo Router | File-based, typed routes |
| Backend | Supabase | Postgres + RLS + Auth + Edge Functions |
| AI Cloud | OpenAI GPT-4o-mini | Via Supabase Edge Function with JWT auth extraction |
| AI On-device | ONNX → pure-JS sentiment classifier + ratio-based pattern detection | No ML runtime dep |
| Subscriptions | RevenueCat (`react-native-purchases` 9.15) | iOS + Android IAP, hosted paywall |
| Notifications | Expo Push (server-triggered) + local | 4 slots, custom times, smart timing (Pro), streak nudge |
| Animations | React Native Reanimated 4 + Lottie | Mascot variants |
| Charts | `react-native-gifted-charts` | Bar + curved line |
| State | Zustand 5 | Stable-selector pattern (s.entries + useMemo) |
| Local Storage | AsyncStorage + expo-secure-store | Anonymous-first |
| Analytics | Vexo | First-party, no ATT |
| Fonts | Fredoka (Google Fonts) + system | Display + body split |

## Specialized Flows

See: `.paul/SPECIAL-FLOWS.md`

Quick Reference:
- `react-native-best-practices` → RN component development, rendering optimization
- `react-native-design` → Screen layout, styling, navigation, animations
- `expo-react-native-javascript-best-practices` → Expo config, notifications, native modules
- `mobile-dev-planner` → Feature architecture planning (optional)
- `accessibility` → Color contrast, screen reader, WCAG 2.1 AA
- `paul` → Plan/apply/unify loop management

## Links

| Resource | URL |
|----------|-----|
| Repository | https://github.com/fernanhick/kibun |
| Privacy Policy | https://fernanhick.github.io/kibun/privacy-policy.html |
| Account Deletion | https://fernanhick.github.io/kibun/delete-account.html |
| App Store ID | `6761697507` |
| Bundle ID | `com.kibun.app` |
| EAS Project | `17e23791-25d6-473c-a2df-62698a5763b6` |
| Product Overview (website source) | `docs/product-overview.md` |
| App Store Submission Audit | `docs/app-store-submission.md` |
| Feature Tour Spec | `docs/feature-tour.md` |
| Paywall Spec | `docs/revenuecat-paywall-spec.md` |

---
*PROJECT.md — Updated when requirements or context change*
*Last updated: 2026-05-07 after Apple 1.1 metadata fix and in-app copy scrub*

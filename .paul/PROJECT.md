# kibun (気分)

## What This Is

Kibun is a cross-platform mobile mood tracking app (iOS + Android) built with React Native and Expo. Users are prompted up to four times daily to log how they're feeling by selecting from a set of color-coded mood bubbles. Over time, the app builds a rich emotional history tied to a detailed user profile (lifestyle, work, sleep, social context) and uses a hybrid AI layer — on-device for basic trends, OpenAI cloud for deep pattern analysis — to surface proactive, personalised insights. The experience is guided by a Shiba Inu mascot that reacts to mood inputs, making check-ins feel warm rather than clinical.

## Core Value

A person who wants to understand their emotional patterns gets a frictionless daily check-in habit and AI-driven insights that reveal patterns they wouldn't notice themselves.

## Current State

| Attribute | Value |
|-----------|-------|
| Type | Application |
| Version | 0.0.0 |
| Status | In Progress |
| Last Updated | 2026-04-05 |

## Requirements

### Core Features

- Mood check-in via color-coded bubble UI (12–16 moods, up to 4x/day)
- Extended onboarding with user profile collection (lifestyle, work, physical, social, mental, goals)
- Anonymous-first auth with Supabase — converts to full account after subscription
- 7-day free trial → subscription paywall (RevenueCat)
- Hybrid AI: on-device trend detection + cloud weekly/monthly narrative reports (OpenAI)
- Proactive push notifications for reminders and AI insights

### Validated (Shipped)
- ✓ Phase 1: Project foundation, navigation, design tokens, MoodBubble, Lottie/Shiba — Phase 1
- ✓ Phase 2: Onboarding flow (first mood, profile collection, notification permission, gate) — Phase 2
- ✓ Phase 3: Paywall (RevenueCat trial), RegistrationScreen (email + Google + Apple OAuth), anonymous banner — Phase 3
- ✓ Phase 4: Core mood check-in experience (bubble grid, note, Supabase sync, slot detection) — Phase 4
- ✓ Phase 5: Main app screens (HomeScreen data + HistoryScreen calendar + DayDetailScreen) — Phase 5

### Active (In Progress)
- Phase 6: Notifications (local + server-triggered)

### Planned (Next)
- Phase 7: Insights and on-device AI
- Phase 8: Cloud AI layer (OpenAI + Supabase Edge Functions)
- Phase 9: Settings, polish, and quality gates

### Out of Scope (V1)
- Social sharing — planned for v2
- Custom mood categories — planned for v2
- Conversational AI chat — future
- Home screen widgets (iOS/Android) — future
- Apple Watch / WearOS companion — future
- Multiple themes — future

## Target Users

**Primary:** Individual personal wellness user
- Wants to understand their own emotional patterns
- Needs low friction — check-in should take under 10 seconds
- Values privacy — sensitive mood data should not feel exposed
- Single user, personal device

**Secondary:** Future social/sharing features may expand to pairs or small groups (v2+)

## Context

**Business Context:**
Personal project initially. Freemium subscription model with 7-day free trial. Target pricing: ~$3.99/month or ~$24.99/year. Subscription revenue offsets OpenAI API costs for cloud analysis.

**Technical Context:**
React Native + Expo (SDK 52+) with Expo Router for file-based navigation. Supabase handles PostgreSQL database, Auth (anonymous + OAuth), Edge Functions for AI triggers, and Realtime. Anonymous users store data locally via AsyncStorage; registered users sync to Supabase. RevenueCat manages subscription state.

## Constraints

### Technical Constraints
- Apple App Store requires explicit notification permission prompt
- Apple requires Apple Sign-In option if any social OAuth is offered
- Anonymous Supabase sessions are device-bound — uninstall = data loss (communicated clearly to user)
- On-device AI limited to simple pattern detection (TensorFlow Lite / ML Kit)
- Expo managed workflow constraints — native modules require bare workflow or Expo config plugins
- App must function on iOS 15+ and Android 10+

### Business Constraints
- OpenAI API key required for cloud AI layer (already sourced)
- RevenueCat account required for subscription management
- Supabase project required (free tier sufficient for early users)

### Compliance Constraints
- Mood and mental health data is sensitive — no third-party sharing, clear privacy policy required
- GDPR considerations if distributed in EU — user data deletion must be supported
- WCAG 2.1 AA color contrast required on mood bubbles

## Key Decisions

| Decision | Rationale | Date | Status |
|----------|-----------|------|--------|
| React Native + Expo over native | Cross-platform from day one avoids future rebuild; Expo ecosystem simplifies notifications and IAP | 2026-04-02 | Active |
| Supabase over Firebase | Postgres schema suits relational mood + profile data; open source; generous free tier | 2026-04-02 | Active |
| Anonymous-first auth | Zero barrier to start; habit forms before account friction; data preserved on conversion | 2026-04-02 | Active |
| OpenAI over Claude API | API key available now; GPT-4o-mini cost-efficient for scheduled analysis | 2026-04-02 | Active |
| Hard paywall at onboarding end with 7-day trial | Wellness app norm; trial converts better than pure hard gate; subscription covers AI costs | 2026-04-02 | Active |
| Hybrid AI (on-device + cloud) | Privacy-first for anonymous users; cloud depth for subscribers; aligns cost with revenue | 2026-04-02 | Active |
| Shiba Inu mascot | Japanese dog breed matches app name (kibun = 気分); expressive, beloved globally; ready-made Lottie assets available on LottieFiles — no custom commission needed | 2026-04-02 | Active |
| Apple Sign In via web OAuth (not native SDK) | Native expo-apple-authentication too complex to configure; Supabase web OAuth is identical UX to Google flow; works cross-platform; preserves anonymous userId via linkIdentity | 2026-04-04 | Active |
| Zustand selectors must return stable refs | .filter()/.map() in selectors creates new refs each render → useSyncExternalStore infinite loop. Select s.entries, derive via useMemo. | 2026-04-05 | Active |
| Custom calendar grid (no library) | 14 moods x tintColor unique to kibun; library overhead not justified; full control over mood-color rendering | 2026-04-05 | Active |

## Success Metrics

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| Onboarding completion rate | >60% | - | Not started |
| Trial-to-subscription conversion | >15% | - | Not started |
| Daily active check-ins per user | ≥2/day | - | Not started |
| 7-day retention | >40% | - | Not started |
| Offline check-in sync accuracy | 100% | - | Not started |
| Crash-free sessions | >99.5% | - | Not started |

## Tech Stack

| Layer | Technology | Notes |
|-------|------------|-------|
| Framework | React Native + Expo (SDK 52+) | Managed workflow |
| Navigation | Expo Router (file-based) | Tab + stack + modal |
| Backend | Supabase | PostgreSQL, Auth, Edge Functions, Realtime |
| AI Cloud | OpenAI API (GPT-4o-mini / GPT-4o) | Via Supabase Edge Function |
| AI On-device | TensorFlow Lite / ML Kit | Basic trend detection |
| Subscriptions | RevenueCat | iOS + Android IAP |
| Notifications | Expo Push Notifications | Local + server-triggered |
| Animations | React Native Reanimated + Lottie | Mascot animations |
| State | Zustand | Lightweight global state |
| Local Storage | AsyncStorage | Anonymous user data |

## Specialized Flows

See: .paul/SPECIAL-FLOWS.md

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
| Repository | — |
| Production | — |
| PLANNING.md | ./PLANNING.md |

---
*PROJECT.md — Updated when requirements or context change*
*Last updated: 2026-04-05 after Phase 5*

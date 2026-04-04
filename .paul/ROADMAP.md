# Roadmap: kibun (気分)

## Overview

Kibun ships in one milestone (v0.1 MVP) covering nine phases: from project foundation through to a fully functional mood tracker with onboarding, paywall, core check-in loop, history, notifications, on-device insights, and cloud AI reports. Each phase builds on the last — auth before check-in, check-in before history, history before insights. The cloud AI layer is the final phase, making it easy to defer if needed without blocking the core product.

## Current Milestone

**v0.1 MVP** (v0.1.0)
Status: In progress
Phases: 3 of 9 complete

## Phases

| Phase | Name | Plans | Status | Completed |
|-------|------|-------|--------|-----------|
| 1 | Foundation & UI Primitives | 5 | Complete | 2026-04-03 |
| 2 | Onboarding | 3 | Complete | 2026-04-04 |
| 3 | Paywall & Auth | 3 | Complete | 2026-04-04 |
| 4 | Mood Check-in | TBD | Not started | - |
| 5 | Main App Screens | TBD | Not started | - |
| 6 | Notifications | TBD | Not started | - |
| 7 | On-Device Insights | TBD | Not started | - |
| 8 | Cloud AI Layer | TBD | Not started | - |
| 9 | Settings & Polish | TBD | Not started | - |

## Phase Details

### Phase 1: Foundation & UI Primitives ✓ (Complete — 2026-04-03)

**Goal:** Working Expo project with navigation, Supabase auth, design tokens, mood bubble component, Lottie integration, and SplashScreen — everything Phase 2 needs to just assemble screens
**Depends on:** Nothing (first phase)
**Research:** Likely (Expo Router setup, Supabase anonymous auth config, Zustand integration, Lottie for React Native)

**Scope:**
- Expo project initialized with TypeScript and Expo Router
- Supabase client configured, anonymous session created on first launch
- Bottom tab navigation shell (Home, History, Insights, Settings)
- Design token system: mood color palette, typography, spacing
- Base theme and shared component primitives (Button, Card, Screen)
- MoodBubble shared component — color-coded, tappable, reusable across onboarding + check-in
- Lottie integration configured + all confirmed Shiba assets loaded and tested
- SplashScreen — app logo + Shiba animation

**Plans:**
- [ ] 01-01: Expo project init, Expo Router setup, TypeScript config
- [ ] 01-02: Supabase client, anonymous auth, session persistence
- [ ] 01-03: Design tokens, base theme, shared component primitives
- [ ] 01-04: MoodBubble component + mood color system (14 moods, all color variants)
- [ ] 01-05: Lottie integration, Shiba assets, SplashScreen

### Phase 2: Onboarding ✓ (Complete — 2026-04-04)

**Goal:** Full onboarding flow assembled from Phase 1 primitives — first mood entry, mascot reactions, profile collection, notification permission
**Depends on:** Phase 1 (MoodBubble, Lottie/Shiba, Supabase, design tokens all ready)
**Research:** Unlikely (all components built in Phase 1 — Phase 2 is assembly and wiring)

**Scope:**
- FirstMoodScreen — Shiba prompts first mood input using MoodBubble component
- MoodResponseScreen — Shiba reacts with fact/phrase based on mood selected
- Profile screens (Personal, Work, Physical, Social, Mental, Goals)
- NotificationPermissionScreen — slot selection + permission request
- Onboarding gate logic (Expo Router) — prevents skipping to main app

**Plans:**
- [x] 02-01: FirstMoodScreen + MoodResponseScreen (bubble wiring + Shiba reactions)
- [x] 02-02: Profile collection screens (Personal, Work, Physical)
- [x] 02-03: Profile collection screens (Social, Mental, Goals) + notification permission + onboarding gate

### Phase 3: Paywall & Auth ✓ (Complete — 2026-04-04)

**Goal:** RevenueCat 7-day trial paywall, registration screen, and anonymous → registered conversion
**Depends on:** Phase 2 (onboarding completes before paywall)
**Research:** Likely (RevenueCat Expo SDK, Supabase OAuth, anonymous account conversion)

**Scope:**
- RevenueCat SDK integrated, products configured
- PaywallScreen with trial offer and skip option
- RegistrationScreen (email, Google, Apple) — shown only post-payment
- Anonymous → registered account conversion (data preserved)
- Anonymous data-loss warning banner (persistent for anonymous users)

**Plans:**
- [x] 03-01: RevenueCat setup, PaywallScreen, trial flow
- [x] 03-02: RegistrationScreen UI, anonymous banner, auth stubs
- [x] 03-03: Real Supabase auth handlers (email updateUser, Google + Apple web OAuth via linkIdentity)

### Phase 4: Mood Check-in

**Goal:** Full mood check-in experience — bubble UI, note field, Supabase save, offline support
**Depends on:** Phase 3 (user has auth state before saving entries)
**Research:** Unlikely (established RN patterns)

**Scope:**
- MoodSelectionScreen — 14 color-coded mood bubbles, grid layout
- MoodConfirmScreen — optional note field, submit, mascot confirmation animation
- Mood entry saved to Supabase (registered) or AsyncStorage (anonymous)
- Offline queue: entries saved locally when offline, synced when connection restored
- Check-in modal accessible from HomeScreen CTA and notification tap

**Plans:**
- [ ] 04-01: Mood bubble UI, color system, MoodSelectionScreen
- [ ] 04-02: MoodConfirmScreen, entry save (Supabase + AsyncStorage), offline queue

### Phase 5: Main App Screens

**Goal:** HomeScreen, HistoryScreen, DayDetailScreen, and bottom tab navigation wired to real data
**Depends on:** Phase 4 (real mood entries needed to populate screens)
**Research:** Unlikely (CRUD queries, calendar UI)

**Scope:**
- HomeScreen — today's check-ins, streak counter, next reminder time, "Log mood" CTA
- HistoryScreen — monthly calendar with color-coded days based on dominant mood
- DayDetailScreen — all check-ins for a tapped day
- Navigation between tabs and into modal check-in flow

**Plans:**
- [ ] 05-01: HomeScreen with live data (today's entries, streak)
- [ ] 05-02: HistoryScreen calendar + DayDetailScreen

### Phase 6: Notifications

**Goal:** Local scheduled check-in reminders and streak nudges configured from onboarding preferences
**Depends on:** Phase 5 (app screens exist; preferences stored from onboarding)
**Research:** Likely (Expo Notifications scheduling, background tasks on iOS/Android)

**Scope:**
- Local notifications scheduled at user-configured slots (up to 4/day)
- Streak nudge: "You haven't checked in today" if no entry by evening
- notification_preferences table read on launch to (re)schedule notifications
- NotificationSetupScreen in Settings for post-onboarding configuration
- Permission decline handled gracefully with in-app fallback prompts

**Plans:**
- [ ] 06-01: Expo Notifications setup, local scheduling from preferences
- [ ] 06-02: Streak nudge logic, NotificationSetupScreen, permission decline handling

### Phase 7: On-Device Insights

**Goal:** InsightsScreen with trend chart, streak stats, and basic pattern detection — all users
**Depends on:** Phase 5 (mood history data), Phase 6 (streak data)
**Research:** Likely (TensorFlow Lite / ML Kit for React Native, charting library selection)

**Scope:**
- InsightsScreen — mood frequency chart, streak display, 7/30-day trend line
- On-device pattern flags (e.g. "You often log Tired on Mondays")
- Data aggregation queries from Supabase (registered) or AsyncStorage (anonymous)
- Charts built with a lightweight RN charting library (Victory Native or similar)

**Plans:**
- [ ] 07-01: InsightsScreen layout, charting library, trend data queries
- [ ] 07-02: On-device pattern detection, pattern flag display

### Phase 8: Cloud AI Layer

**Goal:** Supabase Edge Function triggers weekly/monthly OpenAI report; AIReportScreen displays it; server push notification delivered
**Depends on:** Phase 7 (insights baseline), Phase 3 (subscription gating)
**Research:** Likely (Supabase Edge Functions with OpenAI SDK, server-side push via Expo)

**Scope:**
- Supabase Edge Function: aggregates user mood data + profile, calls OpenAI API, stores report
- Scheduled trigger: weekly (Sunday) and monthly (1st)
- AIReportScreen — displays latest report with narrative insights (subscribed users only)
- Server-pushed notification: "Your weekly kibun report is ready"
- Graceful failure: AIReportScreen shows placeholder if no report yet

**Plans:**
- [ ] 08-01: Supabase Edge Function, OpenAI prompt design, report storage
- [ ] 08-02: AIReportScreen, server push notification, subscription gate

### Phase 9: Settings & Polish

**Goal:** Full settings area, account management, anonymous warnings, quality gate pass
**Depends on:** All prior phases
**Research:** Unlikely (internal wiring)

**Scope:**
- SettingsScreen — notification prefs, theme (light/dark), app version
- AccountScreen — anonymous → registration CTA, subscription status, sign out
- Persistent anonymous data-loss banner (dismissible, reappears weekly)
- All quality gates verified (offline sync, trial expiry, WCAG contrast, iOS 15+ / Android 10+)
- App icon, splash screen, store metadata prep

**Plans:**
- [ ] 09-01: SettingsScreen, AccountScreen, anonymous warning banner
- [ ] 09-02: Quality gate pass, app icon, splash screen, store prep

---
*Roadmap created: 2026-04-02*
*Last updated: 2026-04-04*

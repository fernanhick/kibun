# kibun (気分)
**My Mood Tracker**

---

## Metadata
- **Type:** Application
- **Platform:** React Native + Expo (iOS + Android)
- **Backend:** Supabase (Auth, Database, Edge Functions)
- **AI Layer:** Hybrid (on-device sentiment via ONNX runtime + OpenAI GPT-4o-mini cloud analysis)
- **Status:** V1 shipped — Pro feature expansion in progress
- **Skill Loadout:** react-native-best-practices, react-native-design, expo-react-native-javascript-best-practices, mobile-dev-planner, accessibility, paul

---

## Vision

Kibun is a personal mood tracking app that prompts users to log how they're feeling throughout the day. Over time, it builds a rich emotional history and uses AI to surface patterns, insights, and nudges — helping users understand themselves better. The name kibun (気分) means "mood" or "feeling" in Japanese, and the experience reflects that: honest, gentle, and personal.

---

## Mascot

**Shiba Inu** — the iconic Japanese dog breed. Expressive, instantly recognisable, and beloved globally. The mascot guides the user through onboarding, reacts to mood inputs, and delivers insights. Its expressions change based on the mood the user selects, making the check-in feel warm rather than clinical. Lottie animations implemented: ``shiba-happy.json``, ``shiba-excited.json``, ``shiba-neutral.json``, ``shiba-sad.json``.

---

## Core Concept

- Users are prompted up to 4 times per day (morning, afternoon, night, pre-sleep) to log their mood
- Mood is selected from a compact set of color-coded bubbles (14 moods)
- Each check-in is identical — same bubble UI every time, with an optional one-line note
- The app tracks entries over time and surfaces AI-generated insights proactively via push notification
- AI analysis uses a hybrid model: on-device via ONNX sentiment model for basic classification, OpenAI GPT-4o-mini via Supabase Edge Function for deep reports

---

## Target User

Personal use initially. A single user who wants to understand their emotional patterns without friction. Future versions may include social/sharing features. The app is designed to build a daily habit — low barrier to entry, high value over time.

---

## Mood System

### Color Logic
| Color Spectrum | Mood Range |
|---|---|
| Green (positive) | Happy, Excited, Grateful, Calm |
| Neutral | Meh, Tired, Bored, Confused |
| Red / Orange (intense) | Sad, Anxious, Frustrated, Angry |
| Blue (reflective) | Melancholy, Lonely |

### Implemented Mood Set (14 moods)
Happy, Excited, Grateful, Calm, Meh, Tired, Bored, Confused, Sad, Anxious, Frustrated, Angry, Melancholy, Lonely

Each mood has: ``id``, ``label``, ``group``, ``bubbleColor``, ``textColor`` (WCAG 2.1 AA verified), ``tintColor``. The set is expandable without architectural changes.

---

## Check-in Flow

1. User receives push notification (or taps "Log mood" on Home)
2. ``check-in.tsx`` opens — bubble grid displayed grouped by category
3. User selects a mood (required) + optional one-line note
4. ``mood-confirm.tsx`` shows confirmation with animated Shiba mascot reaction
5. On-device ONNX sentiment model classifies note text (positive/neutral/negative + confidence score)
6. Entry saved: local Zustand store + synced to Supabase (for registered users)
7. **[Pro]** "Reflect" step: AI-generated journal prompt shown after saving — user can write a response
8. **[Pro + negative mood]** "Try an exercise?" CTA shown — links to ``exercise.tsx``
9. Confirmation screen closes, user returns to Home
10. Achievement detection runs against updated store

All four daily check-ins use the same flow. Timestamps auto-detect the correct slot (morning/afternoon/night/pre_sleep).

---

## User Profile (collected during onboarding)

| Category | Fields |
|---|---|
| Personal | Name, age range, gender (optional) |
| Work | Employment type, work setting (remote/office/hybrid), weekly work hours |
| Physical | Exercise frequency, average sleep hours |
| Social | Social frequency (scale) |
| Mental | Self-reported stress baseline |
| Goals | Multi-select: understand emotions / reduce stress / improve sleep / track energy / build self-awareness / notice mood patterns |

This profile data is stored in Supabase and passed as context to the AI analysis layer — enabling personalised insights rather than generic trend summaries.

---

## Onboarding Flow (implemented screens)

| # | Screen | File | Purpose |
|---|---|---|---|
| 1 | First Mood | ``(onboarding)/first-mood.tsx`` | Mascot asks "How are you feeling right now?" — first mood check-in |
| 2 | Mood Response | ``(onboarding)/mood-response/[moodId].tsx`` | Mascot reacts with a fact or motivational phrase |
| 3 | Profile Personal | ``(onboarding)/profile-personal.tsx`` | Name, age range, gender |
| 4 | Profile Work | ``(onboarding)/profile-work.tsx`` | Employment type, work setting, work hours |
| 5 | Profile Physical | ``(onboarding)/profile-physical.tsx`` | Exercise frequency, sleep hours |
| 6 | Profile Social | ``(onboarding)/profile-social.tsx`` | Social frequency |
| 7 | Profile Mental | ``(onboarding)/profile-mental.tsx`` | Stress baseline |
| 8 | Profile Goals | ``(onboarding)/profile-goals.tsx`` | Multi-select goals |
| 9 | Notification Permission | ``(onboarding)/notification-permission.tsx`` | Request push notification permissions |
| 10 | Disclaimer | ``(onboarding)/disclaimer.tsx`` | Privacy and data use disclosure |
| 11 | Paywall | ``paywall.tsx`` | Subscription offer — 7-day free trial, then $5.99/month or $39.99/year |
| 12 | Registration | ``register.tsx`` | Email / Google / Apple sign-up — after trial/subscription accepted |

If user skips the paywall: they continue with free features and a persistent data-loss banner.

---

## Main App Screens (implemented)

**Bottom tab navigation: Home | History | Insights | Settings**

| Screen | File | Purpose |
|---|---|---|
| Home | ``(tabs)/index.tsx`` | Today's check-ins, streak badge, "Log mood" CTA, mood-reactive Shiba, anonymous data-loss banner, achievement badges (Pro) |
| Check-in | ``check-in.tsx`` | Mood bubble grid, optional note, slot auto-detection |
| Mood Confirm | ``mood-confirm.tsx`` | Confirmation animation, Shiba reacts, journal prompt (Pro), exercise CTA (Pro + negative moods) |
| Journal Reflect | ``journal-reflect.tsx`` | **[NEW]** Full-screen journal response input, saves to mood entry |
| Exercise | ``exercise.tsx`` | **[NEW]** Box breathing / 5-4-3-2-1 grounding / gratitude prompts (Pro) |
| History | ``(tabs)/history.tsx`` | Month calendar, day cells colored by top mood, Export button (Pro) |
| Day Detail | ``day-detail.tsx`` | All check-ins for a tapped calendar day |
| Insights | ``(tabs)/insights.tsx`` | Streak stats, 7d/30d toggle, top moods bar chart, mood trend line chart, pattern cards, correlation insights (Pro), AI report CTA |
| AI Report | ``ai-report.tsx`` | Cloud AI weekly/monthly narrative report (Pro) |
| Settings | ``(tabs)/settings.tsx`` | Notification slot toggles, custom notification times (Pro), streak nudge toggle, app version, privacy policy |
| Account | ``account.tsx`` | Auth status, subscription management, sign-out, account deletion |
| Auth Callback | ``auth/callback.tsx`` | Deep link handler for OAuth flows |

---

## Authentication

- **Supabase Auth**, Expo-managed deep linking for OAuth
- Anonymous-first: users can use the app without an account (local storage only)
- Persistent banner warns anonymous users: "Your data is on this device only. Sign up to sync it."
- Anonymous → registered conversion preserves all local mood history
- OAuth callback handled via ``auth/callback.tsx`` deep link (``kibun://auth/callback``)

---

## Monetization

- **Model:** 7-day free trial → subscription required for Pro features
- **Pricing:** $5.99/month or $39.99/year
- **Payment:** RevenueCat (``react-native-purchases``) — entitlement: ``kibun Pro``
- **Skip option available** — free users keep unlimited check-ins with feature restrictions

### Feature Tiers

| Free | Pro ($5.99/month) |
|---|---|
| Unlimited mood check-ins | Everything in Free |
| Today's entries on Home | Full calendar history (unlimited) |
| 7-day mood history | AI Weekly & Monthly Reports |
| Streak tracking | Personalised pattern insights (day-of-week, time-of-day, trend) |
| Basic on-device stats | **[NEW] AI Journaling Prompts** — personalised reflection after every check-in |
| — | **[NEW] Correlation Insights** — sleep/work/exercise vs mood visualised |
| — | **[NEW] Custom Notification Times** — exact reminder times per slot |
| — | **[NEW] Export & Share** — CSV export + shareable mood summary card |
| — | **[NEW] Breathing & Grounding Exercises** — triggered on negative moods |
| — | **[NEW] Achievements & Streak Freeze** — badges, monthly recap, freeze protection |

---

## AI Layer

### On-device (all users)
- ONNX sentiment model (``assets/models/sentiment.onnx``) runs on note text at check-in time
- Outputs: ``sentimentLabel`` (positive/neutral/negative) + ``sentimentScore`` (confidence 0–1)
- Streak detection: consecutive-day check-in counting
- Pattern detection: day-of-week and time-of-day frequency ratios (≥1.5x to surface), trend scoring (two-half comparison)
- All calculations run synchronously against local Zustand store — no network required

### Cloud (Pro users — Supabase Edge Functions)
- **``generate-report``:** Called on-demand from ``ai-report.tsx``; builds prompt from mood entries + user profile; GPT-4o-mini produces 200–300 word narrative; result stored in ``ai_reports`` table; push notification on completion
- **``generate-journal-prompt`` [NEW]:** Called after mood confirmation (Pro users); builds prompt from current mood + last 5 entries + user profile; GPT-4o-mini returns a personalised reflection question; journalPrompt stored with mood entry; graceful fallback if fails (journal step skipped, check-in never blocked)

### Privacy
- Anonymous users: all data stays on device, never sent to cloud
- Registered users: mood data + profile synced to Supabase
- Cloud AI only processes data for Pro users
- No mood data sold or shared with third parties

---

## Notifications

| Type | Trigger | Delivery |
|---|---|---|
| Check-in reminders | Scheduled locally (up to 4/day, per enabled slots) | Expo local push |
| AI report ready | Supabase Edge Function after report generation | Expo server push (via ``push_tokens`` table) |
| Streak nudge | Local — no check-in by 8 pm | Expo local push |
| Achievement unlocked [NEW] | Achievement detection on check-in save | Expo local push |
| Anonymous data-loss warning | In-app only | Persistent banner (not push) |

Custom notification times (Pro): per-slot HH:mm overrides stored in ``notificationPrefsStore.customTimes`` and applied to Expo scheduling in ``src/lib/notifications.ts``.

---

## Data Model (Supabase)

### ``profiles``
- ``user_id`` (FK → auth.users)
- ``name`` (text)
- ``age_range``, ``gender`` (nullable)
- ``employment``, ``work_setting``, ``work_hours``
- ``sleep_hours``, ``exercise``
- ``social_frequency``
- ``stress_level``
- ``goals`` (text array)

### ``mood_entries``
- ``id`` (uuid, PK — client-generated)
- ``user_id`` (FK → auth.users)
- ``mood`` (string — mood id)
- ``mood_color`` (string)
- ``note`` (text, nullable)
- ``check_in_slot`` (morning | afternoon | night | pre_sleep)
- ``logged_at`` (timestamptz)
- ``sentiment_label`` (positive | neutral | negative, nullable)
- ``sentiment_score`` (float, nullable)
- ``journal_prompt`` (text, nullable) **[NEW]**
- ``journal_response`` (text, nullable) **[NEW]**

### ``ai_reports``
- ``id`` (uuid, PK)
- ``user_id`` (FK → auth.users)
- ``report_type`` (weekly | monthly)
- ``period_start``, ``period_end`` (date)
- ``content`` (text — GPT-4o-mini narrative)
- ``mood_summary`` (jsonb — total_entries, top_moods[], avg_entries_per_day)
- ``created_at`` (timestamptz)

### ``push_tokens``
- ``user_id`` (FK → auth.users)
- ``token`` (text — Expo push token)
- ``updated_at`` (timestamptz)

### ``user_achievements`` **[NEW]**
- ``id`` (uuid, PK)
- ``user_id`` (FK → auth.users)
- ``achievement_id`` (text — references achievement constant key)
- ``unlocked_at`` (timestamptz)

### ``streak_freezes`` **[NEW]**
- ``user_id`` (FK → auth.users)
- ``month`` (date — first day of month, unique per user)
- ``freeze_used`` (bool, default false)
- ``freeze_used_on`` (date, nullable)

### ``notification_preferences`` (local store — ``notificationPrefsStore``)
- ``selectedSlots`` (NotificationSlot[])
- ``permissionGranted`` (bool)
- ``streakNudgeEnabled`` (bool)
- ``customTimes`` **[NEW]**: ``{ morning?: string, afternoon?: string, evening?: string, 'pre-sleep'?: string }`` (HH:mm 24h format)

---

## Pro Feature Specifications

### 1. AI Journaling Prompts
- **When:** After mood entry is saved to the store, Pro users see a "Reflect" step with an AI-generated prompt
- **Prompt logic:** Supabase Edge Function ``generate-journal-prompt`` — sends current mood + last 5 entries + user goals/profile to GPT-4o-mini; returns a single open-ended reflection question
- **Example prompts:** *"You have logged Anxious 4 times this week — what feels most uncertain right now?"* / *"You are feeling Calm today — what helped create that feeling?"*
- **Storage:** ``journalPrompt`` + ``journalResponse`` on ``MoodEntry`` (local) and ``journal_prompt`` + ``journal_response`` columns on ``mood_entries`` (Supabase)
- **Fallback:** If the Edge Function fails, the journal step is silently skipped; the check-in is never blocked
- **UI flow:** ``mood-confirm.tsx`` → save entry → call edge function → navigate to ``journal-reflect.tsx`` with entryId + prompt params → user writes response → response saved via store ``updateJournalResponse()``
- **Files:** ``supabase/functions/generate-journal-prompt/index.ts``, ``app/journal-reflect.tsx``, extended ``src/types/index.ts``, extended ``src/store/moodEntryStore.ts``

### 2. Correlation Insights
- **What:** Surfaces the onboarding data actually collected but unused in Insights
- **Calculations (pure frontend, no network):**
  - Sleep vs mood: compares ``sleepHours`` onboarding value against avg daily mood score — shown as context label
  - Stress vs mood: compares ``stressLevel`` (1–5 scale) against mood frequency — shown as pattern card
  - Time-of-day heatmap: 4x7 grid (slots x days of week), each cell colored by avg mood score for that slot/day combination
- **Gating:** Section locked behind ``isPro`` check; shows upgrade card if not Pro
- **Files:** New "Correlations" section in ``app/(tabs)/insights.tsx``, new helper functions in ``src/lib/insights.ts``

### 3. Custom Notification Times
- **What:** Pro users set exact HH:mm per slot instead of app defaults (9am, 2pm, 7pm, 10pm)
- **Storage:** ``customTimes`` field added to ``notificationPrefsStore`` (Zustand + AsyncStorage persist)
- **Scheduling:** ``scheduleSlotNotifications()`` in ``src/lib/notifications.ts`` accepts optional ``customTimes`` param, falls back to ``SLOT_SCHEDULE`` defaults when a slot has no override
- **UI:** "Custom Times (Pro)" section added to ``app/(tabs)/settings.tsx`` below existing toggles — shows a time picker row per enabled slot; locked for free users
- **Time picker:** Uses ``DateTimePicker`` from ``@react-native-community/datetimepicker`` (included in Expo SDK)

### 4. Export & Share
- **CSV Export:** Serializes all ``moodEntryStore.entries`` to CSV (id, mood, note, slot, logged_at, sentiment, journal_response), writes to temp file via ``expo-file-system``, shares via ``expo-sharing``
- **Mood Summary Card:** Captures a styled ``<View>`` via ``react-native-view-shot`` (streak, top 3 moods with tint circles, week date range), shares via ``Share.share()`` (React Native built-in)
- **UI:** "Export" row added to History screen header area, Pro-gated
- **New dependency:** ``react-native-view-shot``

### 5. Breathing & Grounding Exercises
- **Trigger:** When a negative-group mood is confirmed (Anxious, Frustrated, Angry, Sad — ``group === 'red-orange'``), Pro-only CTA appears on ``mood-confirm.tsx``
- **Exercises available:**
  - **Box Breathing (4-4-4-4):** Reanimated circle that expands/contracts/holds through 4 phases — 4 cycles, ~64 seconds. All animation on UI thread via Reanimated worklet.
  - **5-4-3-2-1 Grounding:** Sequential sensory prompt cards that auto-advance: 5 things you can see, 4 hear, 3 touch, 2 smell, 1 taste
  - **Gratitude Prompt:** Single text input: "Name one small good thing about today"
- **Navigation:** ``mood-confirm.tsx`` → ``exercise.tsx?type=box_breathing|grounding|gratitude``
- **Offline:** Fully local, zero network dependency
- **Files:** ``app/exercise.tsx``

### 6. Achievements & Streak Freeze
- **Achievement definitions** (``src/lib/achievements.ts``):
  - ``first_week`` — 7-day streak
  - ``month_warrior`` — 30-day streak
  - ``mood_explorer`` — all 14 moods logged at least once
  - ``reflector`` — 10 journal responses submitted
  - ``early_bird`` — 7 morning slot check-ins
  - ``night_owl`` — 7 pre_sleep slot check-ins
  - ``consistent`` — 30 total check-ins
- **Detection:** ``checkAchievements(entries, unlockedIds)`` runs after every ``addEntry()`` call in ``moodEntryStore``; returns newly unlocked achievement IDs
- **Storage:** ``achievementsStore`` (Zustand + AsyncStorage) holds local ``unlockedIds: string[]``; synced to ``user_achievements`` Supabase table for registered users
- **Push notification:** Sent locally on unlock
- **Streak Freeze:** Pro users get 1 freeze per calendar month; surfaced when streak is about to break; stored in ``streak_freezes`` Supabase table
- **Monthly Retrospective:** Shown once per month on first app open after month end — days logged, % positive moods, longest streak, top mood
- **Files:** ``src/lib/achievements.ts``, ``src/store/achievementsStore.ts``

---

## Technical Stack

| Layer | Technology |
|---|---|
| Framework | React Native + Expo (SDK 52+) |
| Navigation | Expo Router (file-based, typed routes) |
| Backend | Supabase (PostgreSQL, Auth, Edge Functions) |
| AI Cloud | OpenAI API (GPT-4o-mini) via Supabase Edge Functions |
| AI On-device | ONNX Runtime (``onnxruntime-react-native``) — sentiment model |
| Subscriptions | RevenueCat (``react-native-purchases``) |
| Notifications | Expo Push Notifications (local + server) |
| Animations | React Native Reanimated + Lottie (``lottie-react-native``) |
| State Management | Zustand + AsyncStorage persistence |
| Storage (local) | AsyncStorage (anonymous + offline) |
| Storage (cloud) | Supabase PostgreSQL |
| Share Card | ``react-native-view-shot`` **[NEW]** |
| Date/Time Picker | ``@react-native-community/datetimepicker`` (included in Expo SDK) |

---

## V1 Scope

### Implemented (shipped)
- Full onboarding flow (12 screens) with profile collection
- Mood check-in: bubble UI, 14 color-coded moods, optional note, slot auto-detection
- On-device sentiment scoring (ONNX)
- 4 configurable daily reminder slots (toggle on/off)
- Streak nudge notification (8 pm fallback)
- Mood history: calendar view (month grid, tintColor per day)
- Day detail view
- Streak counter + total check-ins stat
- Pattern detection: day-of-week, time-of-day, trend
- Top moods bar chart + mood trend line chart (7d/30d toggle)
- AI weekly/monthly report (GPT-4o-mini via Edge Function)
- Anonymous-first auth with Supabase + OAuth sign-in
- Anonymous → registered account conversion
- RevenueCat paywall — 7-day trial, $5.99/month / $39.99/year
- Account management: sign-out, delete account
- App icon: full-bleed, app name "Kibun" (capital K)

### Pro Expansion (implemented)
1. **AI Journaling Prompts** — ``supabase/functions/generate-journal-prompt/``, ``app/journal-reflect.tsx``
2. **Correlation Insights** — new section in ``app/(tabs)/insights.tsx``
3. **Custom Notification Times** — ``notificationPrefsStore.customTimes``, settings UI
4. **Export & Share** — CSV + view-shot share card in ``app/(tabs)/history.tsx``
5. **Breathing & Grounding Exercises** — ``app/exercise.tsx``
6. **Achievements & Streak Freeze** — ``src/lib/achievements.ts``, ``src/store/achievementsStore.ts``

### DB Migrations Added
- ``supabase/migrations/20260409_add_journal_fields.sql`` — journal columns on mood_entries
- ``supabase/migrations/20260409_add_achievements_streak_freeze.sql`` — user_achievements + streak_freezes tables

### Out (future phases)
- Partner/family shared mood tracking (multi-user)
- Conversational AI chat
- iOS/Android home screen widgets
- Apple Watch / WearOS companion
- Voice journal notes
- Custom mood vocabulary

---

## Quality Gates

- [x] Mood selection works offline (local Zustand save, synced to Supabase on next connection)
- [x] Anonymous → registered account conversion preserves all data
- [x] Trial expiry handled gracefully (no hard crash, clear upgrade CTA)
- [x] Notification permission decline handled (in-app toggle fallback)
- [x] AI report failure handled (no report ≠ broken screen)
- [x] Profile fields marked optional are never required
- [x] Color contrast on mood bubbles meets WCAG 2.1 AA
- [x] App icon full-bleed (no white border artifact)
- [ ] Journal prompt edge function failure: check-in never blocked, step silently skipped
- [ ] Export CSV: validates on iOS and Android share sheet
- [ ] Box breathing animation: 60fps on low-end Android (Reanimated worklet, no JS thread)
- [ ] Achievement detection: synchronous, completes before navigation away from confirm screen
- [ ] Custom notification times: rescheduled correctly when toggling slots on/off

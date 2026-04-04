# kibun (気分)
**My Mood Tracker**

---

## Metadata
- **Type:** Application
- **Platform:** React Native + Expo (iOS + Android)
- **Backend:** Supabase (Auth, Database, Edge Functions)
- **AI Layer:** Hybrid (on-device pattern detection + Claude API cloud analysis)
- **Status:** Ideation complete — ready for `/seed launch`
- **Skill Loadout:** react-native-best-practices, react-native-design, expo-react-native-javascript-best-practices, mobile-dev-planner, accessibility, paul

---

## Vision

Kibun is a personal mood tracking app that prompts users to log how they're feeling throughout the day. Over time, it builds a rich emotional history and uses AI to surface patterns, insights, and nudges — helping users understand themselves better. The name kibun (気分) means "mood" or "feeling" in Japanese, and the experience reflects that: honest, gentle, and personal.

---

## Mascot

**Shiba Inu** — the iconic Japanese dog breed. Expressive, instantly recognisable, and beloved globally. The mascot guides the user through onboarding, reacts to mood inputs, and delivers insights. Its expressions change based on the mood the user selects, making the check-in feel warm rather than clinical. Ready-made Lottie assets available on LottieFiles (emotion-based: sad, stare, happy) — no custom commission needed.

---

## Core Concept

- Users are prompted up to 4 times per day (morning, afternoon, night, pre-sleep) to log their mood
- Mood is selected from a compact set of color-coded bubbles (12–16 moods, expandable)
- Each check-in is identical — same bubble UI every time, with an optional one-line note
- The app tracks entries over time and surfaces AI-generated insights proactively via push notification
- AI analysis uses a hybrid model: on-device for basic trends, Claude API cloud analysis for deep pattern detection

---

## Target User

Personal use initially. A single user who wants to understand their emotional patterns without friction. Future versions may include social/sharing features. The app is designed to build a daily habit — low barrier to entry, high value over time.

---

## Mood System

### Color Logic
| Color Spectrum | Mood Range |
|---|---|
| Green | Happy, Excited, Grateful, Calm |
| Red / Orange | Sad, Angry, Anxious, Frustrated |
| Yellow / Neutral | Meh, Confused, Bored, Tired |
| Blue | Melancholy, Lonely, Nostalgic, Reflective |

### V1 Mood Set (12–16 moods)
Happy, Excited, Grateful, Calm, Meh, Tired, Bored, Confused, Sad, Anxious, Frustrated, Angry, Melancholy, Lonely

Each mood is a colored bubble with the mood name. Bubbles are tappable, visually distinct, and sized consistently. The set is designed to be expandable in future versions without architectural changes.

---

## Check-in Flow

1. User receives push notification (or taps "Log mood" on Home)
2. `MoodSelectionScreen` opens as a modal — bubble grid displayed
3. User selects a mood (required) + optional one-line note (not required)
4. Confirmation animation from Ezo Momonga mascot
5. Entry saved to Supabase (linked to anonymous or registered user ID)
6. Modal closes, user returns to whatever they were doing

All four daily check-ins use the same flow. Timestamps provide time-of-day context for AI analysis.

---

## User Profile (collected during onboarding)

| Category | Fields |
|---|---|
| Personal | Age range, gender (optional), timezone |
| Work | Employment type (full-time / part-time / student / freelance / unemployed), work environment (remote / in-office / hybrid) |
| Physical | Exercise frequency (never / occasionally / regularly / daily), average sleep hours, caffeine and alcohol habits (light-touch) |
| Social | Relationship status, social circle size (scale: alone most of the time → very social) |
| Mental | Self-reported stress baseline, any existing mental health context (optional, clearly framed as optional) |
| Goals | Primary reason for using kibun (manage stress / understand patterns / track mental health / general wellness / other) |

This profile data is stored in Supabase and passed as context to the AI analysis layer — enabling personalised insights rather than generic trend summaries.

---

## Onboarding Flow (screens)

| # | Screen | Purpose |
|---|---|---|
| 1 | `SplashScreen` | App logo + Ezo Momonga animation |
| 2 | `FirstMoodScreen` | Mascot asks "How are you feeling right now?" → bubble UI first mood input |
| 3 | `MoodResponseScreen` | Mascot reacts with a fact or motivational phrase based on mood selected |
| 4 | `OnboardingPersonalScreen` | Age range, gender (optional), timezone |
| 5 | `OnboardingWorkScreen` | Employment type, work environment |
| 6 | `OnboardingPhysicalScreen` | Exercise frequency, sleep hours, caffeine/alcohol |
| 7 | `OnboardingSocialScreen` | Relationship status, social circle size |
| 8 | `OnboardingMentalScreen` | Stress baseline, mental health context (optional, sensitive framing) |
| 9 | `OnboardingGoalsScreen` | Why are you here? (select primary goal) |
| 10 | `OnboardingNotifScreen` | Which check-in time slots to enable + preferred times |
| 11 | `PaywallScreen` | Subscription offer — 7-day free trial, then paid |
| 12 | `RegistrationScreen` | Email / Google / Apple sign-up — shown only after trial/subscription accepted |

If user skips the paywall: they continue as anonymous with limited features and a persistent data-loss warning.

---

## Main App Screens

**Bottom tab navigation: Home | History | Insights | Settings**

| Screen | Tab | Purpose |
|---|---|---|
| `HomeScreen` | Home | Today's check-ins, streak counter, "Log mood" CTA, next reminder time |
| `MoodSelectionScreen` | Modal | Bubble UI mood picker |
| `MoodConfirmScreen` | Modal | Confirmation + optional note |
| `HistoryScreen` | History | Calendar view with color-coded days |
| `DayDetailScreen` | History | All check-ins for a selected day |
| `InsightsScreen` | Insights | Trend chart, streak stats, on-device summaries |
| `AIReportScreen` | Insights | Cloud AI weekly/monthly report (post-trial) |
| `SettingsScreen` | Settings | Notification schedule, theme, preferences |
| `AccountScreen` | Settings | Anonymous → registration conversion, subscription management |
| `NotificationSetupScreen` | Settings | Configure active time slots |

**Total screens: ~22**

---

## Authentication

- **Supabase Auth**, anonymous-first
- On first launch, a temporary anonymous session is created silently
- All mood logs are linked to the anonymous user ID from day one
- When user pays and registers, the anonymous account is converted — all data preserved
- If user skips payment and stays anonymous: data lives on device only, no cloud sync
- Persistent warning for anonymous users: *"Your data is stored locally only. Uninstalling the app will erase it. Create an account to keep it safe."*

---

## Monetization

- **Model:** 7-day free trial → subscription required for full access
- **Hard paywall** at end of onboarding — cannot access main app without starting trial or skipping
- **Skip option available** — anonymous limited access (see below)
- **Pricing target:** ~$3.99/month or ~$24.99/year (standard wellness app range)
- **Payment:** RevenueCat or Expo In-App Purchases (IAP) for subscription management

### Feature tiers

| Free (anonymous) | Paid (subscribed) |
|---|---|
| Unlimited mood check-ins | Everything in free |
| Basic mood history (30 days) | Full history (unlimited) |
| Streak tracking | AI weekly/monthly reports |
| On-device trend chart | Cloud AI pattern detection |
| — | Proactive AI nudges |
| — | Full profile-based personalisation |
| — | Data export |
| — | Custom mood categories (v2) |

---

## AI Layer

### On-device (all users)
- Basic trend charts (mood frequency over time)
- Streak detection and consistency scoring
- Simple pattern flags (e.g. "you often log Tired on Mondays")
- Runs via TensorFlow Lite or React Native ML Kit

### Cloud (subscribed users)
- Deep pattern analysis using user profile as context
- Natural language insight summaries ("You tend to feel more anxious before weekends")
- Weekly and monthly narrative reports delivered via push notification
- Triggered by Supabase Edge Function on a schedule
- Model: OpenAI API (gpt-4o-mini for cost efficiency, gpt-4o for weekly reports)

### Privacy
- Anonymous users: all data stays on device
- Registered users: mood data + profile synced to Supabase
- Cloud AI only processes data for subscribed users
- No mood data sold or shared with third parties

---

## Notifications

| Type | Trigger | Handler |
|---|---|---|
| Check-in reminders | Scheduled locally (up to 4/day) | Expo Push Notifications (local) |
| AI insight ready | Supabase Edge Function after analysis | Expo Push Notifications (server) |
| Streak nudge | Local — "you haven't checked in today" | Expo Push Notifications (local) |
| Data loss warning | Anonymous user — periodic | In-app banner (not push) |

Apple requires an explicit notification permission prompt. This is handled at `OnboardingNotifScreen` with clear framing of what notifications will be sent.

---

## Data Model (Supabase)

### `users`
- `id` (uuid, PK)
- `is_anonymous` (bool)
- `created_at`
- `subscription_status` (trial / active / expired / none)
- `trial_ends_at`

### `profiles`
- `user_id` (FK → users)
- `age_range`, `gender`, `timezone`
- `employment_type`, `work_environment`
- `exercise_frequency`, `avg_sleep_hours`, `caffeine_habit`, `alcohol_habit`
- `relationship_status`, `social_circle_size`
- `stress_baseline`, `mental_health_context` (nullable)
- `primary_goal`

### `mood_entries`
- `id` (uuid, PK)
- `user_id` (FK → users)
- `mood` (string)
- `mood_color` (string)
- `note` (text, nullable)
- `check_in_slot` (morning / afternoon / night / pre_sleep)
- `logged_at` (timestamp)

### `ai_reports`
- `id` (uuid, PK)
- `user_id` (FK → users)
- `period` (weekly / monthly)
- `report_text` (text)
- `generated_at`
- `delivered_at` (nullable)

### `notification_preferences`
- `user_id` (FK → users)
- `morning_enabled`, `morning_time`
- `afternoon_enabled`, `afternoon_time`
- `night_enabled`, `night_time`
- `pre_sleep_enabled`, `pre_sleep_time`

---

## V1 Scope

### In
- Full onboarding flow (12 screens) with profile collection
- Mood check-in (bubble UI, color-coded, 12–16 moods)
- 4 configurable daily reminders
- Mood history (calendar view)
- Basic streak and on-device trend chart
- Anonymous-first auth with Supabase
- 7-day trial paywall + subscription flow
- Registration after payment
- AI weekly report (cloud, subscribed users)
- Proactive push notifications for insights

### Out (future)
- Social sharing
- Custom mood categories
- Conversational AI chat
- Advanced ML on-device model
- Multiple themes
- Widgets (iOS/Android home screen)
- Apple Watch / WearOS companion

---

## Technical Stack

| Layer | Technology |
|---|---|
| Framework | React Native + Expo (SDK 52+) |
| Navigation | Expo Router (file-based) |
| Backend | Supabase (PostgreSQL, Auth, Edge Functions, Realtime) |
| AI Cloud | OpenAI API (GPT-4o mini / GPT-4o) via Supabase Edge Function |
| AI On-device | TensorFlow Lite / ML Kit |
| Subscriptions | RevenueCat |
| Notifications | Expo Push Notifications |
| Animations | React Native Reanimated + Lottie (mascot) |
| State | Zustand or React Context |
| Storage | AsyncStorage (anonymous local) + Supabase (registered) |

---

## Quality Gates

- [ ] Mood selection works offline (local save, sync when online)
- [ ] Anonymous → registered account conversion preserves all data
- [ ] Trial expiry handled gracefully (no hard crash, clear CTA)
- [ ] Notification permission decline handled (in-app fallback prompts)
- [ ] AI report failure handled (no report ≠ broken screen)
- [ ] Profile data marked optional fields are never required
- [ ] Color contrast on mood bubbles meets WCAG 2.1 AA
- [ ] App functions on iOS 15+ and Android 10+

---

## Next Steps

```
/seed launch kibun   — graduate to apps/ + initialize PAUL for managed build
```

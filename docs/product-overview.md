# Kibun — Product Overview

> Source of truth for marketing, the website, the App Store listing, and any external description of the product. Pulled from the actual shipping code (v1.0, build 13). Do not let this drift — when you change a feature, update this file.

*Last verified: 2026-05-07 against the current `master` branch.*

---

## 1. Positioning

### One-line
**Kibun is a kawaii mood tracker that turns daily check-ins into AI-powered insights about your emotional life — guided by a Shiba Inu mascot that makes opening the app feel warm, not clinical.**

### Three-line elevator
Most mood apps look like a clinical chart. Kibun looks like a friend. Pick how you feel from a palette of 14 colour-coded moods, leave a note if you want to, and a Shiba Inu reacts to you. Over time, Kibun learns your emotional rhythms and tells you what they mean.

### Audience
- **Primary:** people who want to understand their emotions but bounce off journaling apps that feel like work or clinical apps that feel cold.
- **Secondary:** anyone who's tried Daylio / Moodflow / How We Feel and wanted something gentler, prettier, and AI-aware.

### What it is *not*
- Not a medical or therapeutic tool — explicit wellness disclaimer is the first onboarding screen.
- Not a journal app — notes are optional and capped to a sentence or two by design.
- Not a social app — no feeds, no sharing, no public anything.

---

## 2. Brand

| | |
|---|---|
| Name | **Kibun** (気分 — "mood" / "feeling" in Japanese) |
| Mascot | Shiba Inu — kawaii illustration style, animated via Lottie, four mood-reactive variants (happy / calm / sad / anxious) |
| Voice | Warm, gentle, never clinical. Lower-case "kibun" in body copy. Avoid "anxiety / depression / therapy" as descriptors of the user. |
| Colour palette | Blue-to-teal hero gradient (`#4A86FF` → teal). Pink-to-purple paywall gradient (`#FF6B9D` → `#C060F0`). Mood bubbles use 14 distinct colours, each WCAG-AA verified against the dark text token (`#1A1A2E`). |
| Typography | Fredoka (display, rounded), system body. |
| Logo | Shiba Inu wearing a "K" collar badge on a circular blue gradient. |

---

## 3. Core feature set

### Mood logging — the daily ritual
- **14 colour-coded moods** in four groups:
  - Green (positive): Happy, Excited, Grateful, Calm
  - Neutral: Meh, Tired, Bored, Confused
  - Red/Orange (high-energy negative): Sad, Anxious, Frustrated, Angry
  - Blue (introspective): Melancholy, Lonely
- **Up to four slots a day:** morning (~9 am), afternoon (~2 pm), evening (~7 pm), pre-sleep (~10 pm). User picks how many they want — most start with two.
- **One-tap entry.** Pick a bubble. Optionally type a short note. Done in under 10 seconds.
- **Slot auto-detection** — the app figures out which slot you're filling based on the time of day.
- **Offline-first.** Entries persist immediately in local storage; sync to Supabase happens in the background for signed-in users.

### History & calendar
- **Custom monthly calendar grid.** Each day is tinted by your dominant mood for that day.
- **Day detail.** Tap any day to see every check-in: mood, time, note, sentiment label.
- **Full history, no pagination tricks.** Free users see all of it.

### Insights (free tier)
- Top moods bar chart (last 7 / 30 days)
- Mood trend line chart with curved area fill
- Streak counter, total check-in counter
- Pattern flags (e.g. "You often log Tired on Mondays") — pure on-device, no ML dependency, threshold-based

### Insights (Pro)
- **Emotional Resilience Score** (0–100) — based on how quickly you recover from difficult moods. Tracks period-over-period.
- **Correlation heatmap** — slot × day-of-week, average mood score per cell.
- **Habit × Mood correlations** — Pearson correlation between tracked habits and daily mood scores.

### Notifications
- 4-slot scheduling (free)
- Custom HH:MM time per slot (free)
- Streak nudge — daily reminder at 8 pm if you haven't logged
- **Smart Timing (Pro):** adaptive reminder times. Learns when you actually check in and shifts reminders to match.

### Mascot interactions
- Shiba reacts to mood inputs with a corresponding animation
- Persistent mascot overlay on certain screens
- Lottie animations: happy, calm, sad, anxious / neutral

### Achievements (all free)
- 🗓️ First Week — 7-day streak
- 🏆 Month Warrior — 30-day streak
- 🌈 Mood Explorer — log all 14 moods
- 📔 Reflector — 10 journal reflections
- 🌅 Early Bird — 7 morning check-ins
- 🦉 Night Owl — 7 pre-sleep check-ins
- ⚡ Consistent — 30 total check-ins

### Calming exercises (free)
- Box Breathing
- Five Senses (sensory grounding pause)
- Body Scan
- Gratitude prompts
- Joy Capture
- Savoring
- Comfort List

These are non-clinical reframings — accessible from the mood-confirm screen for negative-group moods.

### Sentiment on notes
- Optional ONNX-based on-device sentiment classifier. When you write a note, Kibun infers a sentiment label (positive / neutral / negative) and confidence score. Stored with the entry and feeds AI reports. Never leaves the device unless you sync.

---

## 4. Pro features (paywall content)

The paywall lists these explicitly, in this order. Do not reorder for marketing without updating `app/paywall.tsx:26-34`.

| Pro feature | What it actually does |
|---|---|
| ✨ **Daily AI wellness insight** | One personalised reflection per day, generated from recent moods + profile context. |
| 📊 **Weekly & monthly AI mood reports** | Structured narrative reports — headline, summary, patterns, highlight, nudge, tone label. |
| 🎉 **Annual mood report** | "Year in Mood" — yearly recap with AI narrative. |
| 🔮 **Pattern insights & resilience score** | Pro-locked sections on the Insights tab: Resilience score + correlation heatmap. |
| 🌱 **Habit tracking** | Add habits (sleep hours, exercise, meditation, custom). Boolean or 1–5 scale. Per-day logging. |
| 📝 **Life events & mood correlation** | Tag big life events (work / social / health / travel / relationship / personal); see how moods shifted around them. |
| 🎨 **Custom moods** | Define your own mood label + colour, slotted into one of the four groups. |
| 🕒 **Smart Timing** *(in Settings, not paywall list)* | Adaptive reminder times based on your real check-in pattern. |
| 📔 **Journal AI prompts** *(via journal-reflect.tsx)* | AI-generated reflection question paired with your last entry; user types a response. |
| 📈 **Multi-dimensional check-ins** | Energy + focus levels 1–5 alongside the mood. |

### Pricing
- **$5.99 / month** or **$34.99 / year**
- **7-day free trial**, cancel anytime
- Auto-renew, billed at confirmation
- Restore Purchases available in Settings → About
- Manage Subscription deep-links to App Store / Play Store account page

> Pricing is read from RevenueCat at runtime via `Purchases.getOfferings()` so localised currency strings render correctly. The hardcoded values above are the USD fallback at `app/paywall.tsx:39`.

---

## 5. Onboarding flow (14 screens)

Order matters — App Store reviewers walk through this and expect the disclaimer first.

1. **Disclaimer** — "Kibun is a Wellness Tool" (must acknowledge to continue)
2. **Wisdom: Awareness** — "Naming what you feel is the first step"
3. **Wisdom: Mind & Body** — gentle psychoeducation, no clinical framing
4. **Wisdom: Small Shifts** — micro-habits framing
5. **First mood** — pick your first mood from the bubble palette
6. **Mood response** — Shiba reacts; copy varies by mood ID
7. **Profile: Personal** — name, age range, gender (all optional)
8. **Profile: Work** — employment, work setting, hours
9. **Profile: Physical** — sleep hours, exercise frequency
10. **Profile: Social** — social frequency
11. **Profile: Mental** — stress level
12. **Profile: Coping** — coping strategies (multi-select)
13. **Profile: Goals** — what they want from Kibun
14. **Notification permission** — pick slots, request permission

Then: paywall → register (after purchase) → main app.

---

## 6. Auth model

- **Anonymous-first.** First launch creates a Supabase anonymous session. The user can do everything without an account.
- **Account creation only post-paywall.** Email + password, Google OAuth, or Apple Sign In (native via `expo-apple-authentication`).
- **Anonymous → registered conversion preserves data.** `linkIdentity` ties the anonymous Supabase user to the new identity.
- **Anonymous data-loss banner.** Persistent dismissable banner explains: uninstall = data loss for anonymous users. Reappears every 7 days.

---

## 7. Privacy

These are the user-facing claims, all backed by code. Use these on the privacy page.

- **Mood data is yours.** Stored in your device (anonymous) or in your Supabase row, gated by Postgres Row-Level Security (RLS).
- **No third-party sharing of mood data.** Period.
- **Account deletion in-app.** Account screen → Delete account. Calls `delete_user` + `delete_user_data` RPCs which cascade-delete every row across `profiles`, `mood_entries`, `ai_reports`, `habits`, `habit_logs`, `life_events`, `custom_moods`.
- **Sensitive data is encrypted in transit (TLS) and stored with platform-native secure storage** (`expo-secure-store`).
- **No HealthKit, no Health Connect.** Self-reported wellness data, not medical.
- **No location.** No location permission requested.
- **No IDFA / no ATT prompt.** First-party analytics only (Vexo).
- **Privacy Manifest** ships in the iOS bundle (`PrivacyInfo.xcprivacy`).
- **Crisis-resource note** in the onboarding disclaimer and privacy policy directs users to local emergency services / licensed professionals if they're in distress.

### Third-party services
| Service | What it does | Why we need it |
|---|---|---|
| Supabase | Auth, Postgres, Edge Functions | Backend |
| RevenueCat | Subscription state | IAP across iOS + Android |
| OpenAI (via Edge Function) | AI report generation | Pro reports, daily insight |
| Expo / EAS | Build + push token routing | Build infra |
| Vexo | First-party product analytics | Funnel + retention |

---

## 8. Tech stack (for an "About / How it works" page or careers page)

| Layer | Choice |
|---|---|
| Framework | React Native 0.83.4 + Expo SDK 55, managed workflow |
| Language | TypeScript 5.3+ |
| Navigation | Expo Router (file-based, typed routes) |
| State | Zustand |
| Local persistence | AsyncStorage + expo-secure-store |
| UI primitives | Custom (Button, Card, Screen, MoodBubble) on top of RN core |
| Animation | React Native Reanimated 4 + Lottie |
| Charts | `react-native-gifted-charts` (uses RN-SVG; no Skia dep) |
| Backend | Supabase — Postgres + Row-Level Security + Edge Functions |
| AI | OpenAI GPT-4o-mini (via Supabase Edge Function with JWT auth) |
| On-device sentiment | ONNX-trained classifier exported to pure-JS weights — no ML runtime dep |
| Subscriptions | RevenueCat (`react-native-purchases` 9.15) — iOS + Android IAP |
| Push | Expo Push Notifications (server-triggered + local) |
| Analytics | Vexo (first-party only, no ATT) |
| Fonts | Fredoka (display) + system |
| Min OS | iOS 15+, Android 10+ |
| Tablet | First-class iPad support (`supportsTablet: true`, layout primitives that split on wide viewports) |

---

## 9. App Store facts (use verbatim where possible)

> **Reconciled 2026-07-26 to the live V3 listing.** The values below were stale (they predated the Guideline 1.1 compliance rework that stripped clinical terms and moved the category off Health & Fitness). Source of truth for listing copy: `ASO/V3/apple-app-store-submission.md` (live) and `ASO/V4/keyword-strategy.md` (pending keyword-field optimization).

| Field | Value |
|---|---|
| App name | Kibun: Mood Tracker Journal |
| Subtitle | Cute daily diary & self-care |
| iOS bundle ID | `com.kibun.app` |
| Android package | `com.kibun.app` |
| iOS App Store ID | `6761697507` |
| EAS project ID | `17e23791-25d6-473c-a2df-62698a5763b6` |
| Primary category | Lifestyle |
| Secondary category | *(verify in App Store Connect — no longer Health & Fitness under the compliance posture)* |
| Keywords (live, EN) | `emotion,feelings,wellness,gratitude,kawaii,habit,pattern,gentle,calm,sleep,mindful,breathing,joy,pet` |
| Keywords (pending V4, EN) | `emotion,feelings,wellness,gratitude,kawaii,habit,log,reflect,companion,calm,mindful,breathing,pet` |
| Support email | `fernanhick@gmail.com` |
| Privacy policy | https://fernanhick.github.io/kibun/privacy-policy.html |
| Account deletion (web) | https://fernanhick.github.io/kibun/delete-account.html |
| Terms | Apple Standard EULA (https://www.apple.com/legal/internet-services/itunes/dev/stdeula/) |

---

## 10. Website content blocks

These are ready-to-paste copy blocks. Use as-is or as a starting point — all of them are post-Apple-1.1-compliance audit, so no flagged terms.

### Hero
> **Your feelings, gently understood.**
> Kibun is a kawaii mood tracker that turns 10-second daily check-ins into AI-powered insights about your emotional life. A friendly Shiba Inu guides every step, so opening the app feels warm — not cold.
>
> [Start free trial →]   [How it works ↓]

### Three-feature strip
> **Pick a colour.** 14 nuanced moods. One tap to log how you feel.
>
> **See your rhythms.** Calendar, charts, and patterns from your last 7 or 30 days.
>
> **Get personal insights.** Weekly and monthly AI reports tuned to your profile and history.

### Why Kibun (vs. the rest)
- **It looks like a friend, not a chart.** The Shiba does most of the talking.
- **14 moods, not 5.** "Frustrated" and "Melancholy" aren't the same as "sad."
- **Anonymous first.** Try the whole app before you ever see an account screen.
- **Private by default.** Your data lives in your row, gated by Postgres RLS. Nothing is shared.
- **AI that's actually personal.** Reports use your profile, your moods, and your notes — not a generic horoscope.

### What you get
**Free, forever**
- Daily mood logging, up to 4 times a day
- Custom reminder times
- Full mood history & calendar
- Streak tracking + 7 achievements
- Calming exercises (breathing, grounding, gratitude)

**Premium ($5.99/mo or $34.99/yr · 7-day free trial)**
- Daily AI wellness insight
- Weekly & monthly AI mood reports
- Annual "Year in Mood" recap
- Emotional Resilience Score & correlation heatmap
- Habit tracking + Habit × Mood correlations
- Life events tagging
- Custom moods with your own colours
- Smart adaptive reminder timing

### Privacy promise (homepage block)
> Kibun is a wellness tool, not a medical app. Your moods are yours: stored privately, encrypted in transit, never shared with third parties for advertising. You can delete your account and every byte of your data from inside the app at any time.

### FAQ (paste into a /faq page)

**Is Kibun free?**
Yes. Daily mood logging, full history, the calendar, exercises, and achievements are free forever. AI insights, habit tracking, life events, custom moods, and adaptive reminders are part of Premium ($5.99/mo or $34.99/yr, with a 7-day free trial).

**Do I need an account?**
No. Kibun starts you anonymously — you can use the entire free tier without ever signing up. You only create an account when you start a Premium trial. Just remember: anonymous data lives only on your device. If you uninstall, it's gone.

**What does the AI actually do?**
It writes a short, personalised reflection every day, plus a structured weekly and monthly report — headline, summary, patterns it spotted, one bright spot, and one gentle nudge. It uses your profile, your moods, and your optional notes. It does *not* diagnose, treat, or give medical advice.

**Is my mood data private?**
Yes. Mood data is stored either on your device (anonymous mode) or in your own row in our database, protected by Postgres Row-Level Security. We never share it with advertisers or analytics partners. We use first-party analytics only (no IDFA, no ATT prompt).

**Can I delete my data?**
Yes — Settings → Account → Delete Account. We cascade-delete every row across all our tables. There's also a web flow at https://fernanhick.github.io/kibun/delete-account.html.

**Why a Shiba Inu?**
"Kibun" (気分) is Japanese for "mood." A Shiba Inu felt right. The mascot reacts to how you feel because feeling seen — even by a cartoon dog — is one of the things that actually helps.

**What platforms?**
iOS 15+ and Android 10+. iPad and tablets are fully supported.

**Will you add [feature]?**
Maybe. Public sharing, conversational AI, home-screen widgets, and Watch / WearOS companions are on the v2 wishlist. Email us at fernanhick@gmail.com — we read everything.

---

## 11. Screenshots reference (for the website's screenshot strip)

When generating marketing screenshots, hit these screens in this order — they tell the product story.

1. **Home / today** — `app/(tabs)/index.tsx` — today's check-ins + Shiba + Log Mood CTA
2. **Mood selection grid** — `app/check-in.tsx` — 14 colour bubbles
3. **Mood confirm** — `app/mood-confirm.tsx` — note field + Shiba reaction + exercise suggestion
4. **Insights with charts** — `app/(tabs)/insights.tsx` — top moods + trend line + Resilience card
5. **AI Report (structured)** — `app/ai-report.tsx` — headline + summary + patterns + nudge
6. **Calendar / history** — `app/(tabs)/history.tsx` — month grid with mood-tinted days

Captions: short (4–8 words). Avoid clinical terms. Examples already vetted for App Store: "Track how you feel" / "See your rhythms" / "Get insights tuned to you" / "Reminders that fit your life" / "Gentle exercises when you need them" / "Your year, in mood."

---

## 12. Things to know before writing about Kibun

These are non-obvious facts that affect copy choices. They've all bitten us once.

- **Don't use the words "anxiety", "depression", "therapy", "treat", "diagnose", "clinical", "grounding", "5-4-3-2-1", or "EMDR/CBT/DBT" anywhere in marketing copy or in-app strings.** Apple flagged these on Submission ad08bcc1 (2026-05-07) under Guideline 1.1. Full context: `docs/app-store-submission.md` §9b.
- **The exercise formerly known as "Grounding" is now called "Five Senses".** The route param (`type: 'grounding'`) is internal only — never user-facing.
- **Anonymous data is device-bound.** Don't promise "your data follows you" without an account.
- **The Pro paywall is the binding 3.1.2 disclosure surface.** RevenueCat hosts the subscription paywall; our `app/paywall.tsx` is the upstream call-to-action. Both must show price, length, content, terms, privacy in one frame.
- **The mascot is the brand.** Don't ship marketing without it.

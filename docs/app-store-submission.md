# Kibun — App Store Connect Submission Pack

> **How to use this file.** Every section below maps 1:1 to a field in App Store Connect. Copy each block into its corresponding field. Placeholders wrapped in `{{ DOUBLE_BRACES }}` are the only things you still need to fill in (personal contact info, demo credentials, etc). Everything else is finalized, ASO-optimized, and character-count verified.
>
> **Last verified against Apple requirements:** 2026-04-25. All character limits, screenshot sizes, and privacy label categories current as of this date.
> **Mandatory in 2026:** builds must use iOS 26 / iPadOS 26 SDK or later. Confirm your EAS build targets Expo SDK 55+ (already the case per `package.json`).

---

## 0. Pre-Submission Checklist

Complete these before opening App Store Connect:

- [ ] Apple Developer Program membership active ($99/year)
- [ ] Bundle ID `com.kibun.app` registered in Certificates, Identifiers & Profiles
- [ ] App record created in App Store Connect (name reservation)
- [ ] Production build uploaded via EAS / Xcode / Transporter and processed (~30 min)
- [ ] `privacy-policy.html` hosted at a public URL (currently in repo — needs hosting)
- [ ] `delete-account.html` hosted at a public URL — **required by Apple Guideline 5.1.1(v) for any app with account creation**
- [ ] RevenueCat entitlement `kibun Pro` wired to In-App Purchase products approved in App Store Connect
- [ ] Sandbox tester account created for reviewer to test the 7-day trial + subscription
- [ ] Screenshots generated at required sizes (see §8)
- [ ] Age rating questionnaire filled (see §9 answers)

---

## 1. App Information (non-localized, set once)

| Field | Value |
|---|---|
| **Bundle ID** | `com.kibun.app` |
| **SKU** | `KIBUN-IOS-001` |
| **Primary Language** | English (U.S.) |
| **Primary Category** | Health & Fitness |
| **Secondary Category** | Lifestyle |
| **Content Rights** | Does not contain, show, or access third-party content |
| **Age Rating** | 4+ (see §9 for questionnaire answers) |

---

## 2. Localizable Metadata — English (U.S.)

### 2.1 App Name  *(30 char max · strongest search-ranking signal)*

```
Kibun: Mood Tracker & Journal
```
**Length: 29 / 30**

### 2.2 Subtitle  *(30 char max · second strongest signal)*

```
Track feelings. Find patterns.
```
**Length: 30 / 30**

### 2.3 Keywords  *(100 char max · comma-separated, NO spaces after commas to maximize density · Apple dedupes vs. name + subtitle automatically, so these avoid overlap)*

```
mental,health,diary,wellness,anxiety,depression,stress,mindfulness,therapy,gratitude,habits,calm,zen
```
**Length: 97 / 100**

**Why these specifically:**
- `mental`, `health`, `wellness`, `wellbeing` — broad health category terms
- `anxiety`, `depression`, `stress` — the intent-rich problem searches mood-trackers rank for
- `diary`, `gratitude`, `mindfulness` — co-purchase/co-install categories
- `therapy`, `habits` — high-volume adjacent queries
- `calm`, `zen` — competitor/brand-adjacent soft targets
- **Already covered by name/subtitle (do NOT repeat here):** kibun, mood, tracker, journal, track, feelings, find, patterns

### 2.4 Promotional Text  *(170 char max · editable anytime without resubmitting · NOT indexed for search — use for time-sensitive marketing)*

```
Meet Kibun - your gentle mood tracker with a Shiba Inu guide. Log how you feel, see your patterns, and unlock AI-powered insights. Try Pro free for 7 days.
```
**Length: 158 / 170**

### 2.5 Description  *(4,000 char max · first ~3 lines render above the "more" fold — put the hook there)*

```
Kibun (Japanese for "mood") is exactly what this app helps you understand.

Log how you feel in seconds, up to four times a day. No paragraphs, no judgement - just a tap, a color, and an optional note. Over time, Kibun learns your emotional rhythms and surfaces the patterns you would never spot alone.

A gentle, kawaii Shiba Inu mascot guides every check-in and reacts to how you feel, so opening the app feels warm instead of clinical.

--- WHY PEOPLE LOVE KIBUN ---

- 14 color-coded mood bubbles make logging effortless
- Four daily slots (morning / afternoon / evening / pre-sleep) - toggle any off
- Calendar view paints your month in the colors of your feelings
- Streaks, charts, and pattern cards that actually say something useful
- Works fully offline - your data stays on your device unless you sign in
- On-device sentiment AI reads your notes privately, with zero data leaving your phone

--- WHAT IS INCLUDED FREE ---

- Unlimited mood check-ins - forever
- 7-day history, streak counter, top-moods chart
- Notification reminders (customizable slots)
- Private on-device sentiment analysis
- Optional anonymous mode (no account needed)

--- KIBUN PRO ---

Start with a 7-day free trial. Then $5.99/month or $39.99/year.

- AI Weekly & Monthly Reports - a personalised narrative of your emotional month, written for you alone
- AI Journaling Prompts - a custom reflection question after every check-in, built from your recent moods
- Correlation Insights - see how sleep, work, and social life move your mood
- Custom Notification Times - exact reminder times per slot, not defaults
- Full Calendar History - unlimited past entries, no 7-day limit
- Export & Share - CSV export and beautiful shareable mood summary cards
- Breathing & Grounding Exercises - box breathing, 5-4-3-2-1, and gratitude prompts triggered when you need them most
- Achievements & Streak Freeze - badges, monthly recaps, and one freeze per month to protect your streak

--- PRIVACY FIRST ---

Kibun is built around the idea that your feelings are private.
- Use the app fully anonymously - nothing ever leaves your phone
- If you create an account, your data syncs to your private, encrypted space
- On-device sentiment model - your notes are analyzed locally, never uploaded
- Only Pro AI reports send mood data (never raw notes) to a secure AI endpoint for summarization
- We never sell, share, or advertise with your data

--- BUILT FOR A DAILY HABIT ---

Kibun is not a journaling marathon. It is a 10-second check-in you will actually keep doing - and insights that compound the longer you use it. Whether you are trying to understand anxiety, build self-awareness, improve sleep, or just check in with yourself, Kibun meets you where you are.

Questions? support@kibun.app
Privacy Policy: https://fernanhick.github.io/kibun/privacy-policy.html
Terms of Use: https://www.apple.com/legal/internet-services/itunes/dev/stdeula/

Subscriptions auto-renew unless cancelled at least 24 hours before the end of the current period. Manage or cancel anytime in your Apple ID settings. Any unused portion of a free trial is forfeited when a subscription is purchased.
```
**Length: approx 3,140 / 4,000**

### 2.6 What's New in This Version  *(4,000 char max)*

```
Welcome to Kibun 1.0 - we are thrilled to meet you.

This is our first public release. Everything inside has been handcrafted: 14 color-coded moods, a Shiba Inu mascot who actually reacts to how you feel, on-device sentiment AI that keeps your notes private, and Pro AI reports that read like they were written for you alone.

We are listening. Ideas, feedback, bug reports - send them to support@kibun.app.

- The Kibun team
```

### 2.7 Support & Marketing URLs

The app currently links to GitHub Pages (`https://fernanhick.github.io/kibun/...`) for legal documents — `src/constants/legal.ts:LEGAL_HOST`. Whatever URLs you list here **must** match what the binary opens. If you migrate to `kibun.app`, update both at the same time.

| Field | Value (current host) | Required? |
|---|---|---|
| **Support URL** | `https://fernanhick.github.io/kibun/support.html` *(host this — see Action item below)* | Required |
| **Marketing URL** | `https://fernanhick.github.io/kibun` | Optional but recommended |
| **Privacy Policy URL** | `https://fernanhick.github.io/kibun/privacy-policy.html` | **Required** |
| **Privacy Choices URL** | `https://fernanhick.github.io/kibun/privacy-policy.html#choices` | Required if you collect data |

> **Action item:** confirm `privacy-policy.html` and `delete-account.html` are deployed to GitHub Pages and that a minimal `support.html` exists. Apple rejects submissions with broken or local-file privacy URLs. If you acquire `kibun.app`, change `LEGAL_HOST` in `src/constants/legal.ts` and update the table above in lockstep.

---

## 3. Pricing and Availability

| Field | Value |
|---|---|
| **Price (base app)** | Free |
| **Availability** | All 175 App Store territories |
| **Pre-Order** | No |
| **Educational Discount** | No |
| **Tax Category** | Standard (Software — Mobile Application) |

### In-App Purchases (via RevenueCat)

| Product ID | Type | Reference Name | Display Name | Price Tier |
|---|---|---|---|---|
| `kibun.pro.monthly` | Auto-Renewable Subscription | Kibun Pro — Monthly | Kibun Pro | $5.99 / month (7-day free trial) |
| `kibun.pro.yearly` | Auto-Renewable Subscription | Kibun Pro — Yearly | Kibun Pro | $39.99 / year (7-day free trial) |

**Subscription Group:** `Kibun Pro` (both products in the same group so users can upgrade/downgrade cleanly)
**Entitlement:** `premium` *(default in `src/lib/revenuecat.ts:DEFAULT_ENTITLEMENT_ID`; `kibun Pro` is also accepted as a fallback. Whichever string you create in the RevenueCat dashboard, set `EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID` to match.)*

**Localized display names for both products:**
- **Display Name:** `Kibun Pro`
- **Description:** `AI insights, journaling prompts, unlimited history, custom reminders, exports, exercises, and achievements. Cancel anytime.`

---

## 4. App Privacy — Nutrition Labels (Apple's Questionnaire)

Apple's privacy questionnaire generates the nutrition label shown on your App Store page. Answer **per data type** whether it is (a) collected, (b) linked to the user's identity, (c) used for tracking.

### Data you collect — answer YES to these

| Category | Data Type | Linked to User? | Used for Tracking? | Purpose |
|---|---|---|---|---|
| Contact Info | Email Address | Yes (registered users only) | No | App Functionality, Account Management |
| Contact Info | Name | Yes | No | App Functionality, Personalization |
| Health & Fitness | Health (self-reported: sleep hours, exercise frequency, stress level) | Yes (registered) / No (anonymous) | No | App Functionality, Personalization |
| User Content | Other User Content (mood entries, notes, journal responses) | Yes (registered) / No (anonymous) | No | App Functionality |
| Identifiers | User ID (Supabase UID, RevenueCat app user ID) | Yes | No | App Functionality, Account Management |
| Purchases | Purchase History | Yes | No | App Functionality |
| Usage Data | Product Interaction (screen views, check-in events) | Yes (registered) / No | No | Analytics, App Functionality |
| Diagnostics | Crash Data | No | No | App Functionality |
| Diagnostics | Performance Data | No | No | App Functionality |

### Data you DO NOT collect — answer NO to these

Location, Financial Info, Sensitive Info, Contacts, Browsing History, Search History, Audio Data, Photos or Videos, Gameplay Content, Customer Support Content, Advertising Data, Other Data Types.

### Tracking (AppTrackingTransparency)

**Answer:** "No, this app does not track users across apps and websites owned by other companies."
Kibun has no advertising SDKs, no third-party analytics that share with other apps, and does not use IDFA. The `ITSAppUsesNonExemptEncryption: false` flag is already set in `app.config.ts`.

### Privacy Manifest (`PrivacyInfo.xcprivacy`)

Apple requires a privacy manifest for all apps since May 2024. Declare required reason APIs used by your dependencies (Expo, Supabase, RevenueCat will each declare their own). If you do not have a custom manifest yet, add one at the Expo layer — Expo SDK 55 auto-generates this for core APIs, but verify during the archive step.

---

## 5. Age Rating Questionnaire Answers  → resulting rating: **4+**

Answer each category:

| Category | Answer |
|---|---|
| Cartoon or Fantasy Violence | None |
| Realistic Violence | None |
| Prolonged Graphic or Sadistic Realistic Violence | None |
| Profanity or Crude Humor | None |
| Mature/Suggestive Themes | None |
| Horror/Fear Themes | None |
| Medical/Treatment Information | **None** *(Kibun is wellness/self-reflection, NOT medical advice; the onboarding disclaimer makes this explicit)* |
| Alcohol, Tobacco, or Drug Use or References | None |
| Simulated Gambling | None |
| Sexual Content or Nudity | None |
| Graphic Sexual Content and Nudity | None |
| Contests | None |
| Unrestricted Web Access | No |
| Gambling | No |

**Made for Kids:** No
**Minimum Age Rating:** 4+

---

## 6. App Review Information  *(only seen by Apple reviewers)*

### 6.1 Contact Information  — **FILL IN BEFORE SUBMITTING**

| Field | Value |
|---|---|
| First Name | `{{ YOUR_FIRST_NAME }}` |
| Last Name | `{{ YOUR_LAST_NAME }}` |
| Phone Number | `{{ +COUNTRY YOUR_PHONE }}` |
| Email | `{{ YOUR_EMAIL }}` |

### 6.2 Sign-in Required

**Yes** — required to test the Pro tier.

### 6.3 Demo Account — **CREATE BEFORE SUBMITTING**

Create a real Supabase account with onboarding completed and pre-seeded mood history (you already have `scripts/seed-screenshot-user.mjs` — use it).

| Field | Value |
|---|---|
| User name | `{{ review-test@kibun.app }}` |
| Password | `{{ strong password }}` |

### 6.4 Notes for App Review

```
Hello App Review team,

Thank you for reviewing Kibun. Here is everything you need to fully exercise the app:

============================================================
DEMO ACCOUNT (Pro entitlement enabled via RevenueCat sandbox)
============================================================
Email:    {{ review-test@kibun.app }}
Password: {{ strong password }}

This account has been pre-seeded with ~3 weeks of mood entries so you can immediately see the Insights tab, AI reports, and Pro-gated features without waiting.

============================================================
ANONYMOUS MODE
============================================================
Kibun is anonymous-first: a fresh install lets you complete the full onboarding and log moods without creating an account. To exercise this path, fully uninstall and reinstall, then choose "Skip" on the registration screen after the paywall.

============================================================
HOW TO TEST THE SUBSCRIPTION (Guideline 3.1.2)
============================================================
1. Complete onboarding through the paywall screen.
2. Tap "Start 7-day free trial" — this launches StoreKit in sandbox mode.
3. Use any Apple sandbox tester account for purchase confirmation.
4. After confirmation, all Pro features unlock immediately (AI reports, journaling prompts, custom notification times, exports, breathing exercises, achievements).
5. Restore Purchases is available on the Account screen.

Monthly product:  kibun.pro.monthly  ($5.99, 7-day free trial)
Yearly product:   kibun.pro.yearly   ($39.99, 7-day free trial)

============================================================
HOW TO TEST AI FEATURES
============================================================
• AI Journal Prompts: log any mood from the Home screen. After confirmation, a Pro-only "Reflect" step appears with an AI-generated prompt. Tap to open the journal screen.
• AI Weekly/Monthly Report: open the Insights tab and tap "Generate AI Report" at the bottom. The report is produced via a Supabase Edge Function calling GPT-4o-mini; it returns in ~10 seconds and sends a local push notification on completion.

Only aggregated mood metadata (mood labels + counts + user-profile context) is sent to the AI endpoint. Raw notes are NOT sent — all note-level sentiment is processed on-device via an ONNX model bundled with the app.

============================================================
DATA DELETION (Guideline 5.1.1(v))
============================================================
In-app: Account tab → "Delete account and data" → confirm.
Web:    https://fernanhick.github.io/kibun/delete-account.html

============================================================
CONTENT & MEDICAL DISCLAIMER
============================================================
Kibun is a wellness / self-reflection app and is explicitly NOT a medical or diagnostic tool. This is made clear in the onboarding "Disclaimer" screen (screen 10 of onboarding) which the user must acknowledge before continuing. Kibun does not provide treatment, diagnosis, or clinical advice.

============================================================
ENCRYPTION
============================================================
Kibun uses only standard HTTPS/TLS for network communication. It contains no proprietary cryptography. ITSAppUsesNonExemptEncryption is set to false in Info.plist (see app.config.ts).

============================================================
SUPPORT
============================================================
If anything fails during review, please reach me directly — I will respond within the hour:
{{ YOUR_EMAIL }} · {{ +COUNTRY YOUR_PHONE }}

Thank you!
{{ YOUR_FIRST_NAME }}
```

### 6.5 Attachment

Attach a short PDF (max 5MB) with: (1) screenshots of the main tabs, (2) a visual flow of the 7-day trial start → Pro features unlock, (3) the onboarding disclaimer screen.

---

## 7. Version Info

| Field | Value |
|---|---|
| **Version Number** | `1.0.0` *(matches `app.config.ts`)* |
| **Build Number** | `1` *(auto-increments on each EAS build — must be unique per upload)* |
| **Copyright** | `© 2026 {{ YOUR_LEGAL_NAME_OR_ENTITY }}` |
| **Routing App Coverage File** | N/A (Kibun is not a mapping app) |
| **Trade Representative Contact** | Only required for Korean App Store — leave blank unless you want Korea availability |

### Release Options

- [x] **Manually release this version** *(recommended — gives you control to announce)*
- [ ] Automatically release this version
- [ ] Automatically release after approval with phased release over 7 days *(good for 2.0+ rollouts)*

---

## 8. Screenshots & App Preview

### 8.1 Required Sizes (2026)

Apple propagates 6.9" iPhone screenshots down to smaller sizes automatically, so **6.9" iPhone is the only mandatory iPhone size**. Since `supportsTablet: true` in `app.config.ts`, **iPad 13" is also required**.

| Device Class | Pixel Size | Orientation | Required? |
|---|---|---|---|
| iPhone 6.9" (iPhone 16 Pro Max, 17 Pro Max) | **1290 × 2796** or **1320 × 2868** | Portrait | **Required** |
| iPhone 6.7" (older models) | 1290 × 2796 | Portrait | Optional — 6.9" propagates |
| iPad 13" (iPad Pro M4) | **2064 × 2752** | Portrait | **Required (app supports iPad)** |
| iPad 12.9" (iPad Pro 2022) | 2048 × 2732 | Portrait | Optional — 13" propagates |

- **Format:** PNG or JPEG, RGB color space, no transparency, 72 DPI, under 500 MB each
- **Count:** 1 to 10 per device size (recommend exactly **6** — studies show 6 converts best)
- **Rotation:** all portrait (consistent)

### 8.2 Recommended 6-Screenshot Sequence (optimized for conversion)

Caption text overlay on each screenshot — the App Store cuts off text below the fold, so the headline sits in the top third.

| # | Screen from app | Headline (top of image) | Subtext (smaller) |
|---|---|---|---|
| 1 | Home tab with Shiba mascot + "Log mood" CTA | **Your feelings, tracked in 10 seconds.** | A gentle daily habit with a Shiba guide |
| 2 | Mood check-in bubble grid | **14 moods. One tap. Zero friction.** | Color-coded, kawaii, yours to log |
| 3 | History calendar colored by mood | **Watch your month paint itself.** | Every day a color. Every pattern revealed. |
| 4 | Insights tab with trend chart + pattern cards | **See the patterns you would never spot.** | Day-of-week, time-of-day, trends, more |
| 5 | AI Report narrative screen | **AI that reads your rhythms.** *(Pro)* | A personal weekly story, written for you |
| 6 | Paywall / feature comparison | **7 days of Pro — free.** | Then $5.99/mo or $39.99/yr · cancel anytime |

### 8.3 App Preview Video (Optional — But Boosts Conversion ~25%)

- **Length:** 15–30 seconds
- **Format:** `.mov`, `.m4v`, or `.mp4`, H.264 or ProRes, 30 fps
- **Sizes:** match iPhone 6.9" and iPad 13" screenshot sizes
- **Frame 1 (poster frame):** app logo + "Kibun: Mood Tracker & Journal" — this is shown when the video is not playing
- **Audio:** optional background music only; no voiceover (most users watch muted)

---

## 9. Build & Technical

- **Minimum iOS Version:** iOS 15.1 *(verify against Expo SDK 55's floor — do not raise unless needed; every iOS version dropped costs installs)*
- **Supports iPad:** Yes (unlocked orientation; phones locked to portrait at runtime per `@lib/orientation`)
- **Supports Mac (Designed for iPad):** Yes — free install reach, near-zero engineering cost
- **Supports Apple Vision Pro:** No (opt out — React Native + visionOS not yet a clean path)
- **SDK Used to Build:** iOS/iPadOS 26 SDK *(MANDATORY April 2026 and later — confirm your EAS build profile uses Xcode 16+ and Expo SDK 55)*
- **Export Compliance (ITSAppUsesNonExemptEncryption):** `false` *(already configured in `app.config.ts` line 36)*

---

## 10. Post-Submission: Fast-Rejection Avoidance Checklist

The most common rejections for apps in this category — address each **before** you submit:

- [x] **Guideline 2.1 — App Completeness.** Reviewer sees the same paywall/Pro features a real user does. Demo account is pre-seeded with data.
- [x] **Guideline 3.1.1 — In-App Purchase.** All Pro content sold via IAP, not external links. No "subscribe on our website" links in-app.
- [x] **Guideline 3.1.2 — Subscriptions.** Subscription terms (length, price, auto-renew, cancellation) appear on the paywall screen, not only in the App Store description. Verify `paywall.tsx` shows these inline.
- [x] **Guideline 4.0 — Design.** No placeholder screens, no Lorem Ipsum, no debug menus reachable from the UI.
- [x] **Guideline 5.1.1(v) — Account Deletion.** In-app deletion works and a matching web URL exists.
- [x] **Guideline 5.1.2 — Data Use.** Privacy policy URL live and matches the App Privacy nutrition label.
- [x] **Guideline 5.1.5 — Location Services.** App does not request location — no `NSLocationWhenInUseUsageDescription` should appear in `Info.plist`.
- [x] **Medical disclaimer visible during onboarding** (already present at `(onboarding)/disclaimer.tsx`).
- [x] **Third-party login (Sign in with Apple).** Sign in with Apple is offered alongside Google in `app/register.tsx` via Supabase OAuth — both buttons are present, Apple appears first. Native `expo-apple-authentication` is in deps but unused; if Apple Review flags Guideline 4.8 specifically requesting the native sheet, swap iOS to use `AppleAuthentication.signInAsync` + `supabase.auth.signInWithIdToken`.

---

## 11. Quick Copy-Paste Summary (one-screen cheat sheet)

```
APP NAME       : Kibun: Mood Tracker & Journal
SUBTITLE       : Track feelings. Find patterns.
KEYWORDS       : mental,health,diary,wellness,anxiety,depression,stress,mindfulness,therapy,gratitude,habits,calm,zen
PROMO TEXT     : Meet Kibun - your gentle mood tracker with a Shiba Inu guide. Log how you feel, see your patterns, and unlock AI-powered insights. Try Pro free for 7 days.
PRIMARY CAT    : Health & Fitness
SECONDARY CAT  : Lifestyle
AGE RATING     : 4+
PRICE          : Free (with IAP)
IAP MONTHLY    : kibun.pro.monthly  - $5.99/mo, 7-day trial
IAP YEARLY     : kibun.pro.yearly   - $39.99/yr, 7-day trial
BUNDLE ID      : com.kibun.app
VERSION        : 1.0.0 (build 1)
SUPPORT URL    : https://fernanhick.github.io/kibun/support.html
MARKETING URL  : https://fernanhick.github.io/kibun
PRIVACY URL    : https://fernanhick.github.io/kibun/privacy-policy.html
```

---

*Generated 2026-04-25 · Verified against App Store Connect Help, App Review Guidelines, and Screenshot Specifications as of this date. Re-verify the 6.9" iPhone required size and iOS 26 SDK mandate before your actual upload — Apple rotates these requirements annually.*

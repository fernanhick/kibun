# Kibun — Why the app isn't getting downloads

**Date:** 2026-07-29
**Method:** live App Store + Google Play scrape (US, MX, es-419 storefronts), Apple search-API rank probes on 10 category terms, competitor listing teardown (Finch, Daylio, DailyBean, Tochi, Pixy), plus a read of the shipping code, the ASO V1–V4 docs, and the onboarding audit.
**Everything marked "measured" below was pulled live today. Nothing is estimated unless it says so.**

---

> **Revision 2 (same day).** A second sweep added §12–§19 below, including three findings more serious than anything in the first pass: the store screenshots advertise an **obsolete build**, the paywall renders **five fake review stars**, and the Play listing points users at **a domain owned by someone else**. §10's priority plan has been updated. One first-pass claim is corrected in §19.

## 0. The one-sentence diagnosis

Kibun is not failing because the product is bad — it's failing because **almost nobody ever sees the store page, and the few who do see a listing that looks like a different, lower-quality app than the one you actually built.** The strategy documents in `ASO/` describe a good plan that was never actually shipped to the stores.

---

## 1. What is actually live right now (measured)

| | **App Store (iOS)** | **Google Play** |
|---|---|---|
| Title | `Kibun: Mood & Habits Tracker` | `Kibun - Feeling & Habits Diary` |
| Subtitle / short desc | `Cute daily diary & self-care` | `Cute mood tracker & habits diary. Daily check-ins, breathing & your Shiba pet.` |
| Ratings | **0 ratings, 0 reviews** | no rating shown |
| Installs | not disclosed (0 ratings ⇒ very low) | **50+** |
| Live since | 2026-06-08 (51 days) | last updated 2026-06-22 |
| Version | 1.0.1 | — |
| Listing languages | **English only** | English **+ Spanish (es-419)** ✅ |
| Category | Lifestyle + **Productivity** | Lifestyle |
| Min OS | **iOS 16.4** | — |
| Size | 105–110 MB | — |
| Phone screenshots | 4 (+1 preview video) of 10 allowed | 4 of 8 allowed |

### The three facts that matter most

1. **Play shows `50+` downloads.** Seven weeks live. That is not a marketing problem, that's a *distribution has not started* problem.
2. **iOS has zero ratings.** Zero ratings is the single most punishing state on the App Store — it suppresses ranking *and* it suppresses conversion for the handful of people who do land on the page.
3. **The iOS listing is English-only.** The app itself speaks Spanish, the Play listing is fully translated into Spanish… and the App Store listing is not. The entire LATAM strategy from `06-competitive-landscape.md` — the one real structural advantage identified — **is not live on iOS at all.** Looking up the app from the Mexican storefront returns English copy.

---

## 2. Root cause #1 — Kibun is invisible in search

I ran Apple's search API against every term Kibun is supposed to win. Results are the live US top-12.

| Query | Kibun's position | Who's actually there |
|---|---|---|
| `mood tracker` | **not in top 12** | Daylio (60,828 ratings), DailyBean (70,058), How We Feel (28,936) |
| `cute mood tracker` | **not in top 12** | Daylio #1; **"Cute Mood Tracker Diary" #2 with 61 ratings** |
| `mood diary` | **not in top 12** | Daylio, DailyBean, Reflectly |
| `kawaii journal` | **not in top 12** | Mininote, DailyBean, My Daily Diary |
| `habits tracker` | **not in top 12** | Habit Tracker (144,551), Productive (91,096), Fabulous (88,499) |
| `self care pet` | **not in top 12** | Finch (732,674), then 6 small pet apps with 300–4,400 ratings |
| `shiba mood` | **not in top 12** | — |
| `mood tracker shiba` | **not in top 12** | — |
| `kibun` | **#1** | (your own brand name — nobody searches it) |

**Read that table again.** Kibun ranks for exactly one term: its own name. It doesn't even rank for `shiba mood`, a query where it should be the only sensible answer on the entire store.

### Why

**(a) The live titles abandoned the strategy.** The ASO docs specify `Kibun: Cute Mood Tracker Diary` (Play) and `Kibun: Mood Tracker Journal` (iOS). What actually shipped:

- iOS: `Kibun: Mood & Habits Tracker` — dropped `cute`, `diary`, `journal`
- Play: `Kibun - Feeling & Habits Diary` — **does not contain the word "mood" at all**

Play has no keyword field; the title is the single heaviest ranking surface it has. Shipping a Play title without "mood" in a mood-tracker category is the most expensive single character choice in this project.

**(b) Both titles spend characters on `Habits` — the worst term available.** The V4 strategy doc calls `habits tracker` the "standout row… *zero* of the top-10 are title-optimized for the exact phrase." **That is factually wrong.** All ten of the current top-10 have "Habit Tracker" in the title, with 1,362–144,551 ratings each. You are spending ~9 title characters competing against 144k-rating incumbents in a category you don't belong to, while dropping the words you can actually win.

**(c) `Shiba` was deliberately cut from the keyword field.** V4 removed `shiba` from the Spanish keyword field on the reasoning that Shiba search traffic is crypto/games. Consequence: the app does not surface for `shiba mood` or `mood tracker shiba` — the exact queries where Kibun has *zero* competition. The crypto-traffic concern is real for `shiba` alone, but the *combinations* (`shiba mood`, `shiba journal`, `shiba pet app`) are pure, uncontested, high-intent demand and you've opted out of all of them.

**(d) Wrong secondary category.** iOS is `Lifestyle + Productivity`. Every real competitor is `Lifestyle + Health & Fitness` or the reverse (Finch, Daylio, DailyBean, Tochi — all four). Productivity is one of the most crowded categories on the store and shares no browse audience with mood tracking. You've thrown away the Health & Fitness browse surface for nothing.

**(e) iOS min version 16.4.** Daylio ships iOS 14, DailyBean 15.0, Finch 15.6. You're excluding every device stuck between iOS 15.0 and 16.3 for no stated reason.

**(f) The iOS binary declares only English.** The store shows "Languages: English" because the iOS bundle has no Spanish localization declared (there's no `CFBundleLocalizations` in `app.config.ts` `infoPlist`). Spanish-speaking users filter it out, and Apple won't index the app for Spanish-language queries. This is a ~4-line config fix.

---

## 3. Root cause #2 — the screenshots actively repel installs

This is where the biggest immediately-recoverable loss is. Even if search were fixed, this listing would not convert.

### What Kibun's screenshots currently do

I pulled all 9 live images. Findings:

1. **The backgrounds are a blurred photo of an office/lab interior.** Cold, corporate, faintly clinical — the literal opposite of "cozy kawaii ritual." Every one of the four phone frames sits on it.
2. **The mascot covers the primary button in every single frame.** A giant back-of-the-head Shiba is pasted over the bottom of the phone. In frame 1 it covers the words "Log and Share." In frame 2 it covers "Save." In frame 4 it covers the tab bar. It doesn't read as a design choice — it reads like a mistake.
3. **Four frames, three different headline typefaces.** Frame 1 outlined all-caps, frame 2 a rounded mixed-case face, frames 3–4 a third style. On the iPad set there's yet another (a pink/blue 3-D face). It looks like four freelancers were hired separately.
4. **The backgrounds don't match between platforms.** iPhone = blurred office. iPad = pastel balloons and hearts. iPad frame 4 = a photo of a desk with pencils. Three unrelated visual worlds under one app name.
5. **The app-preview video poster is a completely different app.** Different Shiba art style (3-D rendered, not your flat mascot), different UI, and a mood row reading **"Great / Good / Okay / Anxious / Sad"** — five emoji faces that **do not exist in your product** (your app uses 18 Shiba faces). It also uses the word "Anxious," which your own compliance doc bans from all marketing. The first thing a shopper sees is a mockup of a product you didn't build.
6. **Frame 4 advertises failure.** It shows `Recovery Score 24/100` with a red down-arrow, and five habit rows all reading "No pattern yet." You are using your marketing real-estate to show a user doing badly in an empty app.
7. **Frame 4 also has a pasted collage of chart clip-art** ("Correlation Study", "Pattern Inference", "Insight Generation") floating in a speech bubble. At thumbnail size it's illegible noise.
8. **The headlines describe features, not benefits.** "Add a Note, Track Energy and Focus Levels." "Get Details of Your Patterns." Nobody has ever wanted to track their focus levels. People want to know why Mondays feel bad.
9. **No social proof anywhere** — no rating, no download count, no review quote, no badge.
10. **The iPad screenshots show huge empty white space** — the tablet layout is an un-adapted phone layout, and the store screenshot proves it.

### What the apps that win actually do

I pulled the first frames of the three most relevant winners:

| | Frame 1 |
|---|---|
| **DailyBean** (70,058 ratings) | ★★★★★ + a **quoted App Store review** as the headline + a badge bar reading **"10M+ Downloads"** and **"App of the Day — App Store."** Single flat green background. |
| **Finch** (732,674 ratings) | **Zero UI.** Just two mascots hugging, and one huge line: **"Self-care is better together."** Single flat sky-blue background. Frame 2: "Build habits with friends by your side." |
| **Tochi** (843 iOS ratings, 100K+ Play) | **"Understand Your Emotions / Your daily mood companion for self-reflection."** Single flat cream background, one typeface, phone unobstructed. |

The pattern is unmistakable and every one of them follows it:

- **one flat brand colour**, no photographic backgrounds
- **one typeface**, consistent across all frames
- **an emotional benefit** in frame 1, not a feature list
- **the device is never obstructed**
- **social proof early** (DailyBean puts it in frame 1)

Kibun does the opposite on all five.

**Industry context:** a strong screenshot set moves install conversion roughly **+20–35%**, and on iOS only the **first three** screenshots appear in search results without scrolling. Your first three are: a fabricated video poster, a mood grid with the CTA covered by a dog, and a note-entry form. ([AppScreenshotStudio](https://appscreenshotstudio.com/blog/5-app-store-screenshot-mistakes-killing-conversions-2026), [AppTweak](https://www.apptweak.com/en/aso-blog/how-to-optimize-your-app-screenshots))

---

## 4. Root cause #3 — the icon

The icon is a cute Shiba on a blue-orange gradient with hearts, sparkles, **and the word "Kibun" written across the bottom.**

- Text in an app icon is a long-standing ASO anti-pattern: at 60×60 in search results it's unreadable, and the app name is already printed directly underneath it.
- Gradient + sparkles + hearts + dog + wordmark is too many elements; it turns to mush at thumbnail size.
- It doesn't differentiate from the dozens of generic cute-pet icons in the `self care pet` results.

Icon optimization is cited at up to **+25% conversion** — it's the cheapest single asset to test.

---

## 5. Root cause #4 — the description is visibly broken

The live iOS description contains hard line breaks mid-sentence with two-space indents baked in:

```
Kibun is the kawaii Shiba mood tracker and diary that helps you understand how you feel — and what shifts it. In 10 seconds a
  day, check in with your Shiba companion, jot a thought, and watch the patterns appear.
```

That's not a rendering artifact — it's in the stored text. It was pasted out of a hard-wrapped markdown file. On the store page it renders as ragged, indented, broken lines. It looks unprofessional to anyone who expands "more."

---

## 6. Root cause #5 — nothing exists outside store search

There is no evidence in the repo or anywhere else of a single acquisition channel other than "hope ASO works":

- No creator/TikTok seeding, no Reddit presence, no launch post
- No home-screen widget — and note that `Cute Widget: Mood Tracking Pet` shows up organically in the `cute mood tracker` results. Widgets are a primary discovery and retention surface in this exact niche in 2026, and Kibun ships none (no widget target in the Expo config or deps)
- Only one shareable surface in the entire app (`history.tsx` → `Share.share`); no shareable mood card, no year-in-mood image, nothing designed to be posted
- No referral or friend mechanic. Finch's #1 and #2 screenshots are *both* about doing this with friends — that's their growth loop, and it's why they're at 10M+ installs with no VC money

**This is the structural issue.** A zero-rating app cannot bootstrap out of store search alone. Ranking needs installs and ratings; installs and ratings need ranking. Something external has to break the loop.

---

## 7. Root cause #6 — the compliance ban is over-applied and is costing the category's whole vocabulary

`docs/app-store-submission.md` §9b bans `anxiety, depression, stress, therapy, mental health, clinical` from all copy after a Guideline 1.1 flag, and `ASO/V4/keyword-strategy.md` treats this as removing "the category's highest-volume keyword pools permanently."

That conclusion is too broad. **Tochi** — a direct competitor, 100K+ Play installs, sitting in the **Lifestyle** category exactly like Kibun — opens its live App Store description with:

> "Tochi: Your All-in-One **Mental Health** Journal & Mood Tracker App … Whether you need an **anxiety** journal…"

The 1.1 flag was about *how Kibun framed itself* (implying treatment), not a store-wide prohibition on the words. The correct read is "don't claim to treat conditions," not "never say the word." As written, the ban is voluntarily surrendering the highest-volume demand in the category to competitors who are operating inside the same rules.

**Recommendation:** treat this as a re-test, not a law. It's a real risk and it should be run deliberately — reintroduce one term (`mental wellness` or `emotional wellbeing` first, `anxiety journal` later) in the *description body only*, not the title, and see whether review passes. Do not touch it until the screenshot and title work is done, so you can attribute results.

---

## 8. Root cause #7 — the internal documents have drifted from reality

This is why the plan didn't ship. Four sources of truth disagree:

| Fact | `product-overview.md` | Memory | Live store | Actual app |
|---|---|---|---|---|
| Mood count | 14 | 12 | "18+" | **18** |
| iOS title | `Kibun: Mood Tracker Journal` | — | `Kibun: Mood & Habits Tracker` | — |
| Play title | — | — | `Kibun - Feeling & Habits Diary` | — |
| Positioning | "AI-powered insights" | "connects moods to habits" | "kawaii Shiba mood tracker" | — |
| iOS Spanish | claimed | claimed | **not live** | app is bilingual |
| Min iOS | 15+ | — | **16.4** | — |

`product-overview.md` still leads with **"turns daily check-ins into AI-powered insights"** — the exact positioning `06-competitive-landscape.md` explicitly warns is a rejection trap. The docs are contradicting each other and the store copy was written from whichever one was open at the time.

---

## 9. What's genuinely good (don't break these)

- **The Shiba mood grid is the best asset in the project.** 18 distinct, expressive, on-model faces. Nothing in the competitive set matches it — Daylio has flat emoji, DailyBean has beans, Pixy has literal pixels. This is the product.
- **The niche is real and provably winnable.** The #2 result for `cute mood tracker` is an app called "Cute Mood Tracker Diary" with **61 ratings**. That's the bar. It's low. Tochi holds 100K+ Play installs with a hedgehog and a cream background.
- **The onboarding rebuild landed.** The May audit's five fixes are shipped: wisdom interstitials cut, profile screens merged, `reflection.tsx` and `plan-snapshot.tsx` added, paywall skippable. Onboarding is ~9 screens with the first mood logged on screen 2. That's competitive. **The in-app funnel is not your problem right now.**
- **Play Spanish is live and well-written.** `Kibun: Diario Emocional Kawaii` is on-strategy. It's the one place the plan actually shipped.
- **Privacy/anonymous-first is a real differentiator** against Finch, and it's fully backed by code.

---

## 10. What to do, in order

Everything in P0 is a store-side change. **No app rebuild required for any of it.** That's deliberate — you can be live with all of P0 within a week.

### P0 — this week (highest leverage, lowest cost)

**1. Rewrite all four phone screenshots to one system.** This is the single highest-value action available.
   - One flat brand background (your teal `#4C7A6A` or a soft pink) — **delete the blurred office photo entirely**
   - One typeface (Fredoka, which you already own) across every frame
   - Move the mascot so it **never covers a button**
   - Benefit headlines, ~5 words each. Suggested:
     1. `18 Shiba faces for how you actually feel` — the differentiator, front and centre
     2. `Find out what makes your days heavy` — the payoff
     3. `Private. No account. Ever.` — the anti-Finch wedge
     4. `10 seconds a day` — the low-effort promise
   - **Kill the current app preview video.** It shows a UI that doesn't exist and uses a banned word. No video beats a misleading one.
   - **Never ship a screenshot showing a 24/100 score, a red down-arrow, or "No pattern yet."**
   - Play: fill all 8 phone slots, not 4.

**2. Fix the titles.**
   - iOS: `Kibun: Cute Mood Tracker Diary` (30/30) — as the V4 doc originally specified
   - Play: `Kibun: Cute Mood Diary & Shiba` or `Kibun: Cute Mood Tracker Diary` — **"mood" must be in the Play title**
   - Drop `Habits` from both. You cannot win `habits tracker` and it's costing you `diary`/`journal`.

**3. Publish the Spanish App Store listing.** The copy already exists, translated, in `ASO/V4/play-store-submission.md`. Publish to es-MX and es-ES. This costs an hour and doubles your addressable search surface.

**4. Change the iOS secondary category** from Productivity to **Health & Fitness**.

**5. Re-paste the description** from a source without hard line wraps. Five-minute fix for a visibly broken page.

**6. Put `shiba` back in the keyword field** (both locales). You are the only Shiba mood tracker in existence and you've opted out of that query.

**7. Redesign the icon:** remove the "Kibun" wordmark, drop the sparkles and hearts, keep the Shiba face large and centred on a single flat colour. Test it against the current one via Play Store Listing Experiments.

### P1 — next 2–3 weeks

**8. Get to 20+ ratings by any legitimate means.** Zero ratings is a hard ceiling on both ranking and conversion. `expo-store-review` is already wired (`src/lib/reviewPrompt.ts`) — verify it actually fires after a positive moment (a 7-day streak, a completed breathing exercise), not on a timer.

**9. Ship a home-screen widget.** Highest-ROI *product* work available. A mood-of-the-day Shiba widget is (a) a discovery surface in a niche where "cute widget" apps rank organically, (b) a daily-return mechanic, and (c) genuinely screenshot-able.

**10. Build one shareable artefact.** A "my week in Shiba faces" card that exports as an image. That's your only realistic organic loop — the 18 faces are inherently shareable in a way a bar chart isn't.

**11. Seed externally.** 10–20 micro-creators in the kawaii/studygram/self-care niche, plus the obvious subreddits. At 50 installs, one creator post outweighs a quarter of ASO tuning.

**12. Drop min iOS to 15.0** and add `CFBundleLocalizations: ['en', 'es']` to `app.config.ts` `infoPlist` so Apple lists the app as bilingual.

### P2 — after P0/P1 have data

**13. Re-test the compliance ban** as described in §7 — one term, description body only, deliberate.
**14. Reconcile the docs.** Make `product-overview.md` match the shipping app (18 moods, no "AI-powered" lead) and make the live store copy match `ASO/`. Every future pass will drift again until this is fixed.
**15. Reconsider the hard paywall gate** (`app/(tabs)/_layout.tsx` redirects to `/paywall` before the app is reachable). It's skippable, so it's not fatal, but with 50 installs you need retention and reviews far more than you need trial starts.

---

## 11. How to measure whether this worked

You currently have no baseline, which is why nothing in §10 has a promised percentage attached to it. Before shipping P0, record:

- App Store Connect → impressions, product page views, **conversion rate**, by source (search vs browse vs referral)
- Play Console → store listing acquisition, **visitors → installs**
- Rankings for: `cute mood tracker`, `mood diary`, `shiba mood`, `self care pet`, `diario emocional`

Then ship **P0 items 1+2+3 together** (they're inseparable) and re-pull at 14 and 28 days. Use **Play Store Listing Experiments** for the icon and short description — it's free A/B testing and you aren't using it.

The number to watch is **product page views → installs**. If impressions rise but that ratio stays flat, the problem is still the screenshots. If that ratio rises but impressions stay flat, the problem is still the title and keywords.

---

---
---

# SECOND SWEEP — additional findings

Everything below was found on a second pass and was **not** in the first version of this report. Three of these outrank anything in §1–§11.

---

## 12. 🔴 CRITICAL — The store screenshots show a build that no longer exists

The app was redesigned on **2026-06-17** (`0fb454b feat(home): inline mood logger + pink theme, light-only`, which also rewrote `src/constants/theme.ts`). The screenshots on both stores were made from the build *before* that.

| Token | Old theme (what the screenshots show) | Current theme (what users download) |
|---|---|---|
| `primary` | `#4A86FF` bright blue | `#4C7A6A` muted sage |
| `background` | `#E6F4FF` light blue | `#F4EEE2` soft beige |
| `warmCta` | `#FFB22E → #FFD959` orange/yellow | `#BE5276 → #AC4869` deep rose |
| `pink` | `#FF6B9D → #C77DFF` hot pink → vivid purple | `#BC6B7A → #9E6E97` muted rose → muted purple |

Look at the live screenshots: light-blue backgrounds, a hot-pink-to-purple "How are you feeling?" header, a bright orange **Save** button. That is the old palette, exactly. The shipping 1.0.1 build (updated 2026-06-24) has the sage/beige one.

**Three consequences:**

1. **You are advertising the worse version of your own app.** The current sage-and-beige palette is calmer, more cohesive, and much closer to what wins in this category in 2026 (see Tochi's cream, DailyBean's single green). The garish blue/orange build is what shoppers judge you on.
2. **Apple Guideline 2.3.3** requires screenshots to accurately reflect the app in use. This is a rejection risk on the next submission, not just a marketing problem.
3. **The description reinforces the error** — the live Play copy literally says *"Soft blue-to-teal gradient design"*, describing a theme that was deleted six weeks ago. So does `product-overview.md` ("Blue-to-teal hero gradient `#4A86FF`… Pink-to-purple paywall gradient `#FF6B9D → #C060F0`").

**This makes the screenshot rewrite in P0 even more valuable than stated** — you're not just improving the assets, you're finally showing the product you actually built.

---

## 13. 🔴 CRITICAL — The paywall displays five fake review stars

`app/paywall.tsx:326` renders five hardcoded gold `Ionicons name="star"` glyphs, with an accessibility label of **"5 out of 5 stars"** (`screens.json` → `paywall.trust.starsA11y`), directly above the subscribe button.

**The app has zero ratings on both stores.**

This is a fabricated social-proof signal shown at the moment of payment. It is:
- **Deceptive to the user** — flatly, regardless of any policy question
- an **App Store Guideline 2.3.1** (misleading representation) exposure, and the paywall is also your binding 3.1.2 disclosure surface, so it's the worst possible screen to put a false claim on
- a **Google Play Deceptive Behavior** policy exposure

**Remove it today.** This isn't a growth item — it should come out independent of everything else in this report. If you want trust signals on the paywall, use true ones: "Anonymous by default", "No ads, ever", "Export your data anytime", "Cancel anytime". You have real differentiators; you don't need invented ones.

---

## 14. 🔴 CRITICAL — The Play listing sends users to a domain you don't own

**`kibun.app` is a different company's product.** It resolves to a live Vue SPA titled *"Kibun — Share your status in one click"*, with its own sign-in, dashboard and billing pages. `kibun.app/privacy` and `kibun.app/terms` both return 200 — serving *their* pages, not yours.

Your real site is **`kibun-app.com`** (which is good — see §16).

Where the bad domain is wired in:
- `ASO/V4/play-store-submission.md` instructs pasting `Privacy policy: https://kibun.app/privacy` and `Terms: https://kibun.app/terms` into the Play description
- `app.config.ts:11` sets deep-link prefixes to `['kibun://', 'https://kibun.app']` — universal links / App Links configured against a third party's domain, which can never verify (no `assetlinks.json` of yours on their server). It's dead config today, and it's pointing at a stranger.

**Note:** the *currently live* Play description is truncated before that footer (see §15), so the bad links are not live right now — but they're in the doc you'd paste from next time. Fix the doc and the config before the next listing update. The iOS description correctly uses `fernanhick.github.io`.

There is also a **brand-collision problem** worth knowing: another product ships under the name "Kibun" on the .app TLD, and the App Store also contains "Kibun Cafe" and "きぶんカレンダー". The brand name is neither ownable nor searchable — which is exactly why the *descriptive* part of the title (`Cute Mood Tracker Diary`) has to do all the work.

---

## 15. The live Play description is V2, and it's truncated

The V4 Play copy was written on 2026-07-26 and **never published**. The live description is still V2 — you can tell from the tells V4 explicitly replaced: *"Tap a mood, add a note, done."* and *"Sign in only if you want sync across devices."*

Worse, the live text **ends at `★ LANGUAGES ★`**. The entire `★ ABOUT KIBUN ★` block is missing, which means the live listing contains:
- ❌ no privacy policy link
- ❌ no terms link
- ❌ no contact email

A Play listing with no contact route and no policy link in the body is both a support dead-end and needless policy exposure.

**Also live in both store descriptions:** *"Guided breathing & **grounding** exercise library"*. `grounding` is on your own banned-words list — `docs/product-overview.md` states the exercise was renamed to "Five Senses" and that "grounding" must never be user-facing. It's live on both stores.

---

## 16. The website contradicts the app and the stores

`kibun-app.com` is real, well-built, and its store badges point correctly at both listings. But its content has drifted:

| Claim | Website | Live app / stores |
|---|---|---|
| Mood count | **12** colour-coded moods | **18** (stores say "18+") |
| Lead positioning | **"AI reports"** prominent | Store copy deliberately avoids "AI" entirely |
| Free tier history | **"7-day history"** | `product-overview.md` says full history is free |

The mood count is now wrong in **four** places with **four** different numbers (site 12, `product-overview.md` 14, stores "18+", app 18).

The free-tier claim is the damaging one: a landing page telling visitors the free tier caps history at 7 days is a reason not to download.

---

## 17. 🟠 The store listing advertises Pro features as if they were free

The paywall comparison table (`screens.json` → `paywall.comparison.rows`) gates these behind Premium:

`AI journaling prompts` · `Custom moods` · `Breathing exercises` · `Habit & life correlations` · `AI mood reports` · `Custom reminder times` · `Achievements & streak freeze`

Now read the live store description. In the general "what the app does" sections — *above* and separate from the `★ KIBUN PRO ★` block — it advertises:

- "Guided breathing exercises with your Shiba breathing alongside you." → **Pro**
- "Custom mood reminders — set the times that fit your day." → **Pro**
- "Achievements and streaks that celebrate consistency, not perfection." → **Pro**
- "Custom moods — add your own when our defaults don't fit." → **Pro**
- "Track habits, sleep, work, people, and life events alongside your mood." → correlations are **Pro**

Five features presented as things the app does, that a new user cannot actually do. Then a *separate* Pro block re-lists overlapping items under different names, so even a careful reader can't tell what's included.

Combine that with the forced paywall gate (`app/(tabs)/_layout.tsx` redirects to `/paywall` before the app is reachable) and the phrase *"Kibun is free forever"*, and you have a textbook setup for **"bait and switch" one-star reviews**.

**For an app with zero ratings, the first ten reviews determine the next year.** This is a bigger threat than any ranking issue in §2.

**Fix:** make the description's free/Pro split match the paywall table exactly, or move 2–3 of these (breathing exercises and achievements are the obvious candidates) genuinely into free. Cheap goodwill; both are retention drivers, not revenue drivers.

---

## 18. Naming, trust and metadata inconsistencies

| Surface | Value | Problem |
|---|---|---|
| Store copy | "Kibun **Pro**" | three names for one thing |
| Paywall hero | "kibun **Premium**" | |
| iOS IAP display names | "**Pro** Yearly" and "**Kibun** Monthly" | publicly visible on the product page, and they don't even match each other |
| Play developer name | **hickmandev** | reads as hobbyist |
| App Store seller name | **Fernando Andres Fernandez Hickman** | different from Play |
| Competitor sellers | *BlueSignum Corp.*, *Relaxio s.r.o.*, *Finch Care Public Benefit Corporation* | all read as companies |
| iOS age rating | **9+** | Play says **Everyone**; all four competitors are **4+** |

The developer-name point is not cosmetic. This is an app that asks people to record their emotional state. "hickmandev" versus "Finch Care Public Benefit Corporation" is a real trust delta at the exact moment someone decides whether to hand over that data. Pick one company-sounding name and use it on both stores.

The **9+ iOS age rating** also costs you: it's inconsistent with your own Play rating, it's stricter than every competitor, and it narrows eligibility for family/teen browse surfaces in a product explicitly aimed at "teens, students, professionals." Re-run the age questionnaire — there's likely no reason it isn't 4+.

---

## 19. Localization: two finished languages are invisible, and one correction

**The app ships four locales at full parity** — `en`, `es`, `pt`, `de`, six files each, **1,048 translated keys apiece**. That is a lot of completed work.

Store presence for it:

| Locale | App localized | Play listing | App Store listing |
|---|---|---|---|
| English | ✅ | ✅ | ✅ |
| Spanish | ✅ | ✅ custom | ❌ **not published** |
| Portuguese | ✅ | ❌ Google auto-translate only | ❌ |
| German | ✅ | ❌ Google auto-translate only | ❌ |

Portuguese and German are **fully built and shipped in the binary with zero store presence.** Brazil is one of the largest markets in this category. Adding pt-BR and de-DE custom listings is among the cheapest wins available — the hard part (the app) is already done.

And Google's auto-translation is actively damaging the copy. The live pt-BR short description reads *"seus hábitos de respiração"* — "your **breathing habits**" — a mistranslation of "breathing & habits". German and French are machine-translated too, while the title stays English in all of them.

> **Correction to the first pass:** I flagged the 105 MB app size as "heavy." That was wrong. Measured against the competitive set — Tochi 156 MB, DailyBean 160 MB, Daylio 203 MB, Finch 429 MB — Kibun is the **smallest app in its category**. Size is not a problem and should not be worked on. (For reference, the largest asset is `assets/webp animation` at 29 MB across 5 files.)

---

## 20. Smaller items worth logging

- **Two competing theme systems.** `src/constants/theme.ts` (`primary: #4C7A6A`) and `src/theme/ThemeContext.tsx` (`primary: #74AD9A`) define different brand primaries. Consolidate before any visual work.
- **Five different brand colour identities across surfaces:** teal splash + adaptive icon (`#4C7A6A`), blue/orange app icon artwork, sage/beige in-app, blue Play feature graphic, blurred-office screenshots. Nothing ties them together.
- **Play has zero reviews** as well as iOS. There is no ratings section rendered on the Play page at all.
- **`assets/store/` is empty and tracked.** No source files for any store asset are kept in the repo, which is why the screenshots drifted from the build without anyone noticing. Version the screenshot sources.
- **`app.config.ts` has no `CFBundleLocalizations`**, which is the direct cause of the App Store listing "Languages: English" (§2f).

---

## 21. Revised priority order

The original §10 plan stands, but three items jump ahead of everything, and they are not growth work — they're correctness:

### P0 — ✅ DONE 2026-07-29 (code + docs; store consoles still need the paste)

| # | Action | Status |
|---|---|---|
| **A** | Remove the five fake stars from `app/paywall.tsx` (§13) | ✅ replaced with a true claim ("Private by default · No ads, ever") + shield icon; `starsA11y` deleted from all four locales; no other fake-rating UI exists in the app |
| **B** | Fix the free/Pro mismatch in both store descriptions (§17) | ✅ `ASO/V4` EN + ES rewritten with a verified `FREE, FOREVER` / `KIBUN PRO` split. **Verified against code, not the old docs** — see the gating table below |
| **C** | Purge `kibun.app` from `ASO/V4/*` and `app.config.ts` (§14) | ✅ V4 now uses `kibun-app.com/privacy` + `fernanhick@gmail.com`; deep-link prefix reduced to `kibun://` with a comment explaining why; `ASO/README.md` added to stop V1–V3 being pasted from |

**Free/Pro split as verified in the code (2026-07-29)** — this is what the new copy claims, and it supersedes both `product-overview.md` and the old listing text:

| Free (no gate found) | Pro (`isPro` gated) |
|---|---|
| Unlimited daily mood logs, 18 Shiba moods | Guided breathing & calming exercises |
| Full history + calendar + day detail (**no cap** — the website's "7-day history" claim is wrong) | Custom moods (`MoodLogger.tsx:157,182`) |
| Habit tracking (`manage-habits.tsx` has no gate) | Life events (`history.tsx:277`) |
| Daily mood reminders | Data export (`history.tsx:288`) |
| Anonymous, no account, no ads | Habit/life correlations, recovery score, reports |
| | Smart/adaptive reminder timing (`settings.tsx:343`) |
| | Achievements & streak freeze |

> ⚠️ **One unresolved discrepancy for you to settle:** the paywall comparison table lists **"Custom reminder times"** as Premium, but `settings.tsx` only gates *Smart/adaptive* timing — manual per-slot times appear to be free. The new copy takes the conservative reading (manual reminders free, smart timing Pro). Confirm on device and align the paywall table if it's wrong.
>
> ⚠️ **Also still open:** `kibun-app.com/terms` **404s**. Apple copy now uses Apple's Standard EULA; the Play copy carries an inline blocker marker. Publish a terms page or delete that line before pasting to Play.
>
> 💡 **Recommendation (your call, not done):** move **breathing exercises** and **achievements/streaks** into the free tier. Both are retention drivers rather than revenue drivers, and they're the two most likely to feel like a bait-and-switch to a first-time user.

### P0.5 — the screenshot rewrite (§10 item 1) now also fixes §12

Everything already specified there, plus: **shoot the new screenshots from the current sage/beige build.** Delete the misleading preview video. Version the sources in `assets/store/`.

### Then P0 items 2–7 and P1 as originally written, with two additions

- Add **pt-BR and de-DE** custom listings on Play, and all four locales on iOS (§19) — the translation work is already paid for
- Reconcile the mood count to **18** everywhere, and fix the website's "7-day history" and "AI reports" claims (§16)
- Fix the developer name and re-run the iOS age questionnaire (§18)

---

## Appendix — competitive scoreboard (measured 2026-07-29)

| App | iOS ratings | iOS ★ | Play installs | Play ★ | Store languages | Category |
|---|---|---|---|---|---|---|
| **Finch: Self-Care Pet** | 732,674 | 4.95 | 10M+ | 4.9 | 1 (EN) | Health & Fitness / Lifestyle |
| **DailyBean** | 70,058 | 4.81 | — | — | 9 | Lifestyle / H&F |
| **Daylio Journal** | 60,828 | 4.77 | 10M+ | 4.7 | **34** | Lifestyle / H&F |
| **Tochi** | 843 | 4.70 | 100K+ | 4.4 | 9 | Lifestyle / H&F |
| **Pixy Mood Tracker** | — | — | 10K+ | 4.7 | — | — |
| **Kibun** | **0** | **—** | **50+** | **—** | **1 (iOS) / 2 (Play)** | **Lifestyle / Productivity** |

Notes:
- Finch reportedly reached ~$30–40M ARR bootstrapped, with a growth loop built entirely on the social/friends mechanic visible in its first two screenshots.
- Daylio's 34 store languages are the clearest evidence that localization, not features, is what scales a mood tracker.
- Tochi is the proof point that matters most for Kibun: **843 iOS ratings**, a hedgehog, a cream background, benefit-led screenshots, 9 languages — and 100K+ Play installs. That is an entirely reachable target.

### Sources
- [AppScreenshotStudio — 5 screenshot mistakes killing conversions (2026)](https://appscreenshotstudio.com/blog/5-app-store-screenshot-mistakes-killing-conversions-2026)
- [AppTweak — how to optimize your app store screenshots](https://www.apptweak.com/en/aso-blog/how-to-optimize-your-app-screenshots)
- [ASOMobile — ASO in 2026](https://asomobile.net/en/blog/aso-in-2026-the-complete-guide-to-app-optimization/)
- [ScreenFast — App Store conversion rate benchmarks 2026](https://screenfast.app/blog/app-store-conversion-rate-benchmarks-2026)
- [Sparrow Apps — Finch: how a self-care app hit $30M ARR without VC money](https://blog.sparrowapps.io/p/finch-how-a-self-care-app-hit-30m-arr-without-vc-money)
- [Gridfiti — aesthetic mood tracker apps](https://gridfiti.com/aesthetic-mood-trackers/)

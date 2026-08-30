# V6 — Copy-paste metadata package, all four locales

**Date:** 2026-08-30
**Supersedes:** `ASO/V5/metadata-paste-package.md` §1–§4. V5 was never pasted, so nothing is lost by replacing it. V5's *analysis* still stands; V6 changes the values.
**Descriptions:** unchanged — still paste from `ASO/V4`. This package covers names, subtitles, keyword fields, titles and short descriptions only.

> Read `ASO/README.md` first. Do not paste from `ASO/V1–V3` — they contain a domain we don't own.

---

## Why V6 exists

V5 assumed Kibun was ranking badly. It isn't ranking **at all**.

On 2026-08-30, 52 keyword probes were run live against the iTunes Search API across five storefronts — 28 US terms drawn from `aso-keywords-us-longtail-targets.csv`, plus 24 across MX, ES, BR and DE.

**Kibun appeared in the top 10 for none of them.**

It ranks **#1 for `kibun`** and #1 for `kibun mood`, so the app is indexed and healthy. It simply does not contain the words people search. The failure is not competitive strength — it is vocabulary coverage.

### The lanes are soft

These are not contested terms. Measured the same day:

| Keyword | Kibun | Top-10 shape |
|---|---|---|
| `mood companion` | absent | #1 has **4 ratings**; 6 of top 10 have ≤5 |
| `mood check in` | absent | four results in the top 10 have **0 ratings** |
| `shiba mood` | absent | **no app in the top 9 has "shiba" in its title** |
| `aesthetic mood tracker` | absent | a 2-rating app ranks #6 |
| `kawaii diary` | absent | median 1,586 ratings |
| MX `mascota autocuidado` | absent | **8 of 8** results under 50 ratings |
| MX `registro de ánimo` | absent | median **1** rating |
| BR `registro de humor` | absent | median **2** ratings |
| DE `gefühle tagebuch` | absent | **9 of 9** results under 50 ratings |

Kibun ships full Spanish, Portuguese and German, and has an actual self-care pet. Three of those lanes are empty and the product is already built for them.

### Correction to the research file

`aso-keywords-us-longtail-targets.csv` marks `habit tracker` **High** priority, rationale *"Winnable per CSV (t84/d51, 0 top-10 title matches)."*

Live measurement contradicts this: **8 of the top 10 carry "Habit Tracker" in the title**, averaging 10,640 ratings. The CSV's `title_matches_top10` column is unreliable — it reports 0 for `habits tracker` as well.

The habit lane is unwinnable with 0 ratings, and it is currently consuming ~9 characters of the iOS name. **Dropping it is the single biggest character reclaim available.**

### Method caveat

The iTunes Search API is a related index, not the App Store's live ranking algorithm — treat exact positions as directional. What survives the caveat is the pattern: absent from 52 of 52 while apps with 0–5 ratings are present, which independently matches `docs/growth/2026-07-29-why-no-downloads.md`.

---

## The rule that shapes every field below

**Apple combines tokens across name + subtitle + keyword field.** A word already in the name or subtitle is wasted characters in the keyword field.

Every keyword field below was checked against its own name and subtitle. **Zero duplicate tokens across all four locales.** That is why the keyword fields look sparse — the obvious words are already carried by the name.

---

## 1 · APP STORE CONNECT — English (U.S.)

### App Name — 30 max
```
Kibun: Cute Mood Tracker Diary
```
**[30 / 30]** — unchanged from V5. Front-loads the brand, then the two highest-volume generics, led by the differentiator `Cute`. Drops `Habits`.

### Subtitle — 30 max  ⚠ **changed from V5**
```
Mood log, journal & Shiba pet
```
**[29 / 30]**

V5 kept the live subtitle `Cute daily diary & self-care` and called it "already well built." That was right when the name still said `Mood & Habits Tracker` — but once the name becomes `Cute Mood Tracker Diary`, **every one of those terms is already covered**. Keeping it would spend 28 characters repeating tokens Apple already has.

Respending it on `log`, `journal`, `Shiba` and `pet` buys the `mood log`, `mood logger` and `self care pet` lanes measured above.

### Keywords — 100 max, comma-separated, no spaces
```
emotion,feelings,kawaii,companion,checkin,aesthetic,gratitude,cozy,reflect,stress,wellbeing,habit
```
**[97 / 100]** — 12 terms, none duplicating the name or subtitle.

Changes from V5: **added** `checkin`, `aesthetic`, `cozy` (all measured-soft lanes). **Removed** `shiba`, `log`, `pet` — not because they were wrong, but because the new subtitle now carries them, so repeating them wastes 15 characters. **Removed** `breathing` — no measured lane. **Kept** `stress` and `wellbeing` on V5's evidence.

### Categories
- Primary: **Lifestyle** *(unchanged)*
- Secondary: **Health & Fitness** ← change from `Productivity`

Finch, Daylio, DailyBean and Tochi are all Lifestyle + Health & Fitness.

### Age rating — ✅ already 4+, no action
V5 said to re-run the questionnaire. Verified 2026-08-30: the listing already returns `4+`.

### Description
Paste from `ASO/V4/apple-app-store-submission.md`. **This is now urgent, not cosmetic** — see §6.

---

## 2 · APP STORE CONNECT — Spanish (Mexico **and** Spain)

🔴 **Does not exist.** The iOS listing is English-only. Roughly an hour of work per locale.

### Nombre — 30 máx
```
Kibun: Diario Emocional Kawaii
```
**[30 / 30]**

### Subtítulo — 30 máx
```
Registro de ánimo y mascota
```
**[27 / 30]** — `registro de ánimo` has a median of **1 rating** in MX and 9 in ES. `mascota` targets `mascota autocuidado`, where all eight results are under 50 ratings.

### Keywords — 100 máx
```
emociones,autocuidado,gratitud,bienestar,lindo,habitos,respiracion,shiba,estres,reflexion,calma
```
**[95 / 100]** — no accents (Apple normalizes), no duplicates of the name or subtitle.

### Descripción
Paste the Spanish block from `ASO/V4/apple-app-store-submission.md`.

---

## 3 · APP STORE CONNECT — Portuguese (Brazil)

🔴 **Does not exist**, on either store. Brazil is one of the largest markets in this category and the app is already fully translated.

### Nome — 30 máx
```
Kibun: Diário de Humor Fofo
```
**[27 / 30]**

### Subtítulo — 30 máx
```
Registro de humor e mascote
```
**[27 / 30]** — `registro de humor` has a median of **2 ratings**, with 8 of 10 under 50.

### Keywords — 100 máx
```
emocoes,autocuidado,gratidao,bemestar,habitos,respiracao,shiba,estresse,reflexao,calma,fofinho
```
**[94 / 100]**

---

## 4 · APP STORE CONNECT — German

🔴 **Does not exist**, on either store. **The softest lane measured anywhere in this audit.**

### Name — 30 max
```
Kibun: Stimmungstagebuch & Pet
```
**[30 / 30]** — `Stimmungstagebuch` is the head term; `Pet` buys the companion lane in the same 30 characters.

Alternative if you want the cute signal in the name instead: `Kibun: Süßes Stimmungsbuch` **[26 / 30]**.

### Untertitel — 30 max
```
Gefühle tracken mit Shiba
```
**[25 / 30]** — `gefühle tagebuch` returned **nine results, all under 50 ratings**.

### Keywords — 100 max
```
stimmung,tagebuch,achtsamkeit,dankbarkeit,haustier,selbstfuersorge,niedlich,journal,wohlbefinden
```
**[96 / 100]** — `stimmung` and `tagebuch` are listed separately even though the name contains the compound `Stimmungstagebuch`; Apple does not reliably split German compounds, so the standalone tokens are worth their characters. Umlauts written out (`ue`, `ss`) as Apple normalizes.

---

## 5 · PLAY CONSOLE — all four locales

Play has no keyword field, so the title carries the entire ranking load.

| Locale | Field | Value | Count |
|---|---|---|---|
| en-US | Title | `Kibun: Cute Mood Tracker Diary` | 30/30 |
| en-US | Short | `Cute mood tracker & diary. Daily check-ins, breathing & your Shiba pet.` | 71/80 |
| es-419 + es-ES | Title | `Kibun: Diario Emocional Kawaii` | 30/30 |
| es-419 + es-ES | Short | `Registro de ánimo lindo. Check-ins diarios, respiración y tu mascota Shiba.` | 75/80 |
| pt-BR | Title | `Kibun: Diário de Humor Fofo` | 27/30 |
| pt-BR | Short | `Registro de humor fofo. Check-ins diários, respiração e seu mascote Shiba.` | 74/80 |
| de-DE | Title | `Kibun: Stimmungstagebuch` | 24/30 |
| de-DE | Short | `Süßes Stimmungstagebuch. Tägliche Check-ins, Atemübungen & dein Shiba.` | 70/80 |

The live en-US title is `Kibun - Feeling & Habits Diary`, which **contains no "mood" at all**. This is the single highest-impact change in this document.

⚠ The en-US short description differs from live (`Cute mood tracker & habits diary…`, 78 chars). Dropping `habits` is deliberate and on-strategy, but it **is** a change — count it when attributing results.

### Category & tags *(unchanged)*
- Category: **Lifestyle**
- Tags: `Mood` · `Journal` · `Self care` · `Mindfulness` · `Habits`
- Do **not** add the `Mental health` tag — it triggers Play's Health Content review. That is a separate policy surface from the words used in copy (see §6).

### Full descriptions
Paste from `ASO/V4/play-store-submission.md`. The pt-BR and de-DE listings currently fall back to Google auto-translation, which mangles the copy — the live pt-BR short description reads *"seus hábitos de respiração"* ("your **breathing habits**").

⚠ `kibun-app.com/terms` now returns **200** — the page shipped 2026-08-30 (`kibun-web` `2624698`). The Terms line in the Play description can stay.

---

## 6 · Vocabulary — the ban was over-applied, and here is the measurement

Competitor App Store descriptions, counted live 2026-08-30:

| App | Category | Ratings | anxiety | depression | mental health | stress |
|---|---|---|---|---|---|---|
| **Tochi** | Lifestyle | 843 | **7** | 3 | **13** | 6 |
| Finch | Health & Fitness | 745,739 | 2 | 2 | 6 | 2 |
| Daylio | Lifestyle | 61,349 | 2 | — | 1 | 1 |
| Reflectly | Health & Fitness | 81,696 | 2 | 1 | 2 | 2 |
| Moodistory | Health & Fitness | 921 | 3 | 1 | 4 | 1 |
| DailyBean | Lifestyle | 70,349 | — | — | 3 | — |
| **Mininote** | Lifestyle | 20,820 | — | — | — | — |
| **Pixy Mood Tracker** | Productivity | 135 | — | — | — | — |

**Tochi settles it.** Closest comparable in the store — Lifestyle, cute, mood tracker, 843 ratings — and it uses `anxiety` seven times and `mental health` thirteen times in its live description. It has not been pulled.

**But the bottom two rows matter more.** Mininote and Pixy use none of this vocabulary, and Mininote is the **#1 result for `kawaii journal` and `cute journal` with 20,820 ratings**. The cute lane does not need clinical vocabulary to win. It wins on `cute`, `kawaii`, `cozy`, `aesthetic` — which is exactly where §1–§5 spend their characters.

### Standing decision

- 🟢 **Reclaim in description body:** `stress`, `wellbeing`, `mental health` (category framing, ~2 uses max). Already correct in `ASO/V4`.
- 🟡 **Leave `anxiety` / `depression` alone** — not because they are unsafe, but because Kibun has a Guideline 1.1 rejection on file and its competitors don't, and the measured payoff is in the kawaii lane where these words earn nothing. Revisit only after titles and screenshots are measured, one term at a time, never bundled.
- 🔴 **Never in name, subtitle, keyword field, or the Play tag.** The apps that put clinical terms in titles (eMoods, `Clarity: CBT Self Help Journal`) are positioned as clinical tools — Clarity sits in the **Medical** category. Kibun is not that product.

Full tiers: `ASO/compliance-vocabulary.md`.

### ⛔ Two Tier 3 words are live right now

The **iOS description** contains `clinical` ×1 and `grounding` ×1. `clinical` is the exact word Apple flagged in the 1.1 rejection — and it was flagged *even used as a positive contrast*, which is the construction it appears in here.

The **Play description** carries both, plus `Soft blue-to-teal gradient design` (a theme retired 2026-06-17) and a free/Pro split that contradicts itself inside one description.

The iOS description also has **no privacy link and no contact email**, and is hard-wrapped with two-space indents mid-sentence, so it renders visibly broken. Re-type or paste through a plain-text editor.

Pasting the `ASO/V4` descriptions fixes all of this at once.

---

## 7 · Screenshots — the conversion half

Audited all seven live App Store frames on 2026-08-30. **They read as work from four different studios.**

| # | Headline | Problems |
|---|---|---|
| 1 | *(logo + 3 pill buttons)* | blue-teal gradient, bubbly display face, scattered emoji — reads as a casual game |
| 2 | DISCOVER YOUR TRUE WELLNESS JOURNEY | shows **AI Report** and **"Not enough data yet"** |
| 3 | GIVE EVERY DAY A REASON TO SMILE | cream ground, old blue/orange UI |
| 4 | JOURNEY TO A JOYFUL PAW-SITIVE VIBE! | mascot covers device; shows the mood **Anxious**; only 14 moods visible |
| 5 | GIVE EVERY DAY A REASON TO SMILE | **duplicate headline**, mascot covers device |
| 6 | GIVE EVERY DAY A REASON TO SMILE | **third use of the same headline**, same device content |
| 7 | JOURNEY TO YOUR EXCITED VIBE! | pink sparkle ground, mascot covers device |

**Three of seven slots carry the identical headline over near-identical device content.** Four background treatments, two typefaces, four distinct Shiba art styles. The mascot obstructs the device in four frames. Frames 2 and 4 put compliance problems directly on the storefront.

### What the leaders do

Daylio, How We Feel, Tochi and Mininote converge on four rules, none of them expensive:

1. **One flat ground colour for the whole set** — Daylio green, How We Feel black, Tochi and Mininote cream. No gradients, no sparkles, no photos.
2. **One typeface.** Tochi runs a headline plus a quieter subhead; Kibun uses no subheads at all.
3. **Product is the hero and never obstructed.** How We Feel and Daylio drop the device frame entirely and let the UI bleed off-edge — which makes the screen bigger at thumbnail size, where the decision is actually made.
4. **Frame 1 carries the strongest asset.** Daylio opens with "App of the Day" plus Forbes / The Guardian / Mashable / Lifehacker. Kibun opens with a logo and three buttons.

### Direction for the rebuild

The build already has the answer: sage `#4C7A6A` on beige `#F4EEE2`, rose `#B0496A` for accents, **Fredoka** as the display face. `scripts/aso/compose.py` is built and smoke-tested against exactly this, and outputs correct 1290×2796. Full spec: `docs/growth/screenshot-spec.md`.

Seven distinct headlines, no duplicates. Delete the preview video — it shows a UI that no longer exists.

**⛔ Still the only blocker:** four captures from the current sage/beige build into `screenshots/captures/` — mood picker with all 18 faces, home with 3–4 check-ins, insights with *positive* data (never the 24/100 score or "No pattern yet"), history with a mostly-filled month. `scripts/seed-screenshot-user.mjs` seeds them.

---

## 8 · Order of work

1. **Record the baseline.** App Store Connect impressions / product page views / **conversion rate**, split by Search / Browse / Referral. Play: store listing acquisition → visitors → installs. There is no baseline today, and without one none of this is measurable.
2. **Paste the V4 descriptions to both stores.** This removes the two live Tier 3 words and restores the privacy link and contact email. Do this first — it is a compliance fix, not an optimization.
3. **Ship §1–§5 together.** All four locales, both stores, one pass. Split across weeks and attribution is lost.
4. **Rebuild the screenshots** once the four captures exist.
5. **Re-pull at 14 and 28 days.**

- Impressions up, conversion flat → screenshots are still the problem.
- Conversion up, impressions flat → titles and keywords are still the problem.
- Neither moves → the change did not index; check for a rejected or pending review.

⚠ An iOS name change re-indexes the app; rankings churn for 1–2 weeks. Expect noise before signal, and **do not revert inside that window.**

---

## Verification

Every value in §1–§5 was programmatically character-counted and checked for token duplication against its own name and subtitle. All 24 fields are within limits; zero keyword-field duplicates across all four locales.

Measurement sources, all 2026-08-30: iTunes Search API (US, MX, ES, BR, DE storefronts, 52 queries), iTunes Lookup API, and a full Google Play listing scrape. Competitor vocabulary counts taken from live App Store description text the same day.

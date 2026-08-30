# V5 — Copy-paste metadata package

**Date:** 2026-07-29
**Purpose:** P0 items 2–6 from `docs/growth/2026-07-29-why-no-downloads.md`. Everything here is ready to paste into the two consoles. **No new assets or builds required.**
**Character counts verified programmatically.** Every value below fits its field.

> Read `ASO/README.md` first. Do not paste from `ASO/V1–V3` — they contain a domain we don't own.

---

## ✅ Re-verified live on 2026-08-30

Every field below was re-checked against the live stores before this package was declared ready. Three things changed since it was written on 2026-07-29.

**1. Age rating is already `4+` — that item is done.** The iTunes lookup returns `contentAdvisoryRating: 4+`. §1's instruction to "re-run the questionnaire targeting 4+" is **stale; skip it**. (The `9+` recorded on 2026-07-29 is either fixed or was mismeasured.)

**2. Everything else in §1–§4 is still pending, exactly as described:**

| Field | Live on 2026-08-30 | Still to change |
|---|---|---|
| iOS name | `Kibun: Mood & Habits Tracker` | yes |
| iOS categories | Lifestyle + **Productivity** | yes → Health & Fitness |
| iOS listing languages | `EN` only | yes → add es-MX + es-ES |
| Play title | `Kibun - Feeling & Habits Diary` | yes |
| iOS ratings | **0** | — |
| Min iOS / size | 16.4 / 105 MB | — |

**3. The live Play description is worse than the docs recorded.** It was pulled in full (3,323 chars) and it is *not* merely "V2 and truncated" — it carries live compliance and accuracy defects:

- ⛔ **`grounding` is live** — "Guided breathing & **grounding** exercise library". Tier 3 named technique.
- ⛔ **`clinical` is live** — "Cozy daily ritual, not a **clinical** checklist". This is the exact word Apple flagged in the Guideline 1.1 rejection, *and it was flagged even as a positive contrast*, which is the same construction used here.
- ❌ **"Soft blue-to-teal gradient design"** — the app has been sage/beige since 2026-06-17. The description advertises a theme that no longer exists.
- ❌ **The free/Pro contradiction is live and self-contradicting inside one description.** Custom reminders, achievements/streaks, custom moods and breathing are listed as general features, then listed *again* under ★ KIBUN PRO ★.
- ❌ **The tail is genuinely missing.** No ★ ABOUT KIBUN ★ section → no privacy link, no terms link, no contact email on the live Play listing.

The V4 replacement copy was validated against all of this and is clean: 3,574 chars (under 4,000), zero Tier 3 terms, correct `kibun-app.com` domain, correct "18+ moods", privacy link and email present, and `mental health` used exactly once in permitted category framing ("a mental health journal that never feels like homework").

**⛔ One hard blocker remains:** `https://www.kibun-app.com/terms` still returns **404** (privacy returns 200). The Play description's `Terms:` line must be deleted, or the page published, *before* pasting §3. Apple is unaffected — its copy points at Apple's Standard EULA.

---

## Why the titles change

The live titles abandoned the strategy and are the main reason the app ranks for nothing:

| | Live now | Problem |
|---|---|---|
| iOS | `Kibun: Mood & Habits Tracker` | Spends ~9 chars on `Habits` — the top-10 for `habits tracker` all have "Habit Tracker" in the title with **1,362–144,551 ratings**. Unwinnable. Drops `cute` and `diary`. |
| Play | `Kibun - Feeling & Habits Diary` | **Contains no "mood" at all.** Play has no keyword field, so the title is the heaviest ranking surface it has. |

Measured evidence that the `cute` lane is winnable: the **#2** result for `cute mood tracker` is an app literally named *"Cute Mood Tracker Diary"* with **61 ratings**.

---

## 1 · APP STORE CONNECT — English (U.S.)

### App Name — 30 max
```
Kibun: Cute Mood Tracker Diary
```
**[30 / 30]** — front-loads brand, then the two highest-volume generics (`Mood Tracker`, `Diary`), led by the differentiator `Cute`.

### Subtitle — 30 max *(unchanged — already well built)*
```
Cute daily diary & self-care
```
**[28 / 30]** — `cute` / `daily` / `diary` / `self` / `care` all index. Leave it alone to preserve continuity while the name re-indexes.

### Keywords — 100 max, comma-separated, no spaces
```
emotion,feelings,gratitude,kawaii,habit,log,reflect,companion,shiba,stress,wellbeing,breathing,pet
```
**[98 / 100]**

Changes from the V4 proposal: **`shiba` added back**, plus **`stress` and `wellbeing` reclaimed** (`calm` and `wellness` dropped to make room — `calm` was already flagged in `keyword-strategy.md` as first-to-cut). Full evidence and risk tiers: **`ASO/compliance-vocabulary.md`**.

On `stress`: the original rejection fix **explicitly kept it** ("usually accepted as an emotional state, not a clinical diagnosis"); `keyword-strategy.md` banned it later by mistake. On `wellbeing`: `emotional wellbeing` is the softest lane measured — the #3 result has **0 ratings**, #6 has 70, #7 has 1.

On `shiba` specifically: V4 cut it on the theory that Shiba traffic is crypto/games. That's true of `shiba` *alone*, but Apple auto-combines tokens — and the app currently does **not** surface for `shiba mood` or `mood tracker shiba`, queries where Kibun is the only sensible answer on the entire store. Those combinations are uncontested. `mindful` was dropped to make room (red-ocean term, no feature backing it).

### Primary / Secondary Category
- Primary: **Lifestyle** *(unchanged)*
- Secondary: **Health & Fitness** ← **change from `Productivity`**

Finch, Daylio, DailyBean and Tochi are *all* Lifestyle + Health & Fitness. Productivity shares no browse audience with mood tracking and is one of the most crowded categories on the store.

### Age Rating — ✅ **already done, skip**
~~Re-run the questionnaire targeting **4+**.~~ Verified live 2026-08-30: the listing already returns **4+**. No action.

### Description
Paste from `ASO/V4/apple-app-store-submission.md` (already corrected: accurate free/Pro split, `grounding` removed, correct domain).
⚠️ **Re-type or paste through a plain-text editor.** The live description has hard line breaks with two-space indents baked in mid-sentence — it was pasted from a hard-wrapped markdown file and renders visibly broken.

---

## 2 · APP STORE CONNECT — Spanish (Mexico) **and** Spanish (Spain)

🔴 **This localization does not exist yet.** The App Store listing is English-only — a lookup from the Mexican storefront returns English copy. The entire LATAM advantage identified in `market-analysis/06-competitive-landscape.md` is not live on iOS. Creating these two localizations is roughly an hour of work.

### Nombre — 30 máx
```
Kibun: Diario Emocional Kawaii
```
**[30 / 30]**

### Subtítulo — 30 máx
```
Rastreador de ánimo y hábitos
```
**[29 / 30]**

### Keywords — 100 máx
```
emociones,bienestar,gratitud,respiración,calma,estrés,autocuidado,mascota,reflexión,registro,shiba
```
**[98 / 100]** — `compañero` dropped (overlaps `mascota`); `shiba` and `estrés` added. See `ASO/compliance-vocabulary.md`.

### Descripción
Paste the Spanish block from `ASO/V4/apple-app-store-submission.md`.

---

## 3 · PLAY CONSOLE — English (en-US)

### Title — 30 max
```
Kibun: Cute Mood Tracker Diary
```
**[30 / 30]** — **the single highest-impact change in this document.** Puts `mood` and `tracker` into the title for the first time.

Alternative if you want the mascot in the title (only if you also expect to win on brand): `Kibun: Cute Mood Diary & Shiba` **[30 / 30]**

### Short description — 80 max  ⚠ **this IS a change**
```
Cute mood tracker & diary. Daily check-ins, breathing & your Shiba pet.
```
**[71 / 80]** — the *(unchanged)* label here was wrong. Live today is `Cute mood tracker & habits diary. Daily check-ins, breathing & your Shiba pet.` **[78 / 80]**. This value drops `habits`, which is deliberate and on-strategy — the same reasoning that removes `Habits` from the title — but it is a change, so treat it as one when attributing results.

Queue these as **Store Listing Experiments** (free A/B testing you currently aren't using):

| Variant | Chars | Lane |
|---|---|---|
| `Cute mood tracker, diary & mood log. Daily check-ins with your Shiba pet.` | 73 | `mood log` |
| `Your cute self-care companion. Mood log, diary, breathing & a Shiba pet.` | 72 | self-care / companion |
| `Cute daily mood diary with breathing, habits & your Shiba companion.` | 68 | companion |

### Full description
Paste from `ASO/V4/play-store-submission.md`.
⚠️ The live one is still **V2** *and* is truncated before `★ ABOUT KIBUN ★` — so the live listing currently has **no privacy link, no terms link, and no contact email**. Make sure the whole block goes in.
⚠️ Delete the `Terms:` line, or publish `kibun-app.com/terms` first — it 404s today. The file marks this inline.

### Category & tags *(unchanged)*
- Category: **Lifestyle**
- Tags: `Mood` · `Journal` · `Self care` · `Mindfulness` · `Habits`
- Do **not** add `Mental health` — triggers Play's Health Content review.

---

## 4 · PLAY CONSOLE — Spanish (es-419 **and** es-ES)

The Spanish listing already exists and is on-strategy. Two changes:

### Title — 30 max *(keep)*
```
Kibun: Diario Emocional Kawaii
```

### Full description
Replace with the corrected Spanish block from `ASO/V4/play-store-submission.md` — the live one advertises Pro features as free and contains `grounding`.

---

## 5 · Two more locales you've already paid for

The app ships **four** locales at full parity — `en`, `es`, `pt`, `de`, 980 translated keys each. Store presence for `pt` and `de` is **zero**; Play falls back to Google auto-translation, which is mangling the copy (the live pt-BR short description says *"seus hábitos de respiração"* — "your **breathing habits**").

Creating custom **pt-BR** and **de-DE** Play listings is among the cheapest wins available: the expensive part (localizing the app) is already done. Brazil is one of the largest markets in this category.

> Note: `ASO/V4`'s header still says "Kibun is localized in-app in English and Spanish only" and warns against adding other languages. **That note is out of date** — `pt` and `de` shipped since it was written.

---

## 6 · Paste order and what to measure

Ship **§1 + §2 + §3 together** — the title change and the Spanish listing are inseparable if you want to attribute the result.

**Before you paste**, record the baseline (you have none today):

| Console | Metric |
|---|---|
| App Store Connect | Impressions · Product Page Views · **Conversion Rate**, split by Search / Browse / Referral |
| Play Console | Store listing acquisition → **Visitors → Installs** |
| Both | Rankings for `cute mood tracker`, `mood diary`, `shiba mood`, `self care pet`, `diario emocional` |

Re-pull at **14** and **28** days.

- Impressions up, conversion flat → the screenshots are still the problem.
- Conversion up, impressions flat → the title/keywords are still the problem.

⚠️ A name change on iOS re-indexes the app and rankings move around for ~1–2 weeks. Expect noise before signal. Do not revert inside that window.

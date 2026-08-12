# Kibun — Keyword Strategy (V4)

> **Version:** V4 — keyword-field optimization on top of V3's listing.
> **Date:** 2026-07-26
> **Status:** Proposed — review, then paste the new keyword fields into App Store Connect.
> **Parent listing:** `ASO/V3/apple-app-store-submission.md` (name, subtitle, description, screenshots unchanged).
>
> **Scope note:** V4 changes **only the iOS keyword field** (EN + ES). Name, subtitle, description, and screenshots are held constant to preserve ranking continuity. The keyword field is the lowest-risk, highest-ROI surface to change — it's invisible to users and re-indexes quickly.

---

## 1. Why this pass exists

The `aso-keywords-us.csv` research run surfaced a lot of high-"opportunity" keywords, but the opportunity score is blind to two things that decide whether a keyword is worth a slot: **relevance** (does the searcher want an app like Kibun?) and **trademark risk** (can we legally target it?). Filtering the sheet on those two axes collapses the "winners" list dramatically — and exposes ~4 wasted slots in our current field plus 3 missing on-brand tokens.

This doc records the reasoning and the exact strings to paste.

### The three constraints that shape everything

1. **Compliance ban.** ⚠️ **This clause was over-stated and has been superseded by `ASO/compliance-vocabulary.md` (2026-07-29).** Apple's actual Guideline 1.1 flag covered `anxiety`, `depression`, `therapy`, `clinical`, `grounding`, `5-4-3-2-1` and symptom-intervention framing. It did **not** cover `stress` (which the original fix explicitly *kept* as "an emotional state, not a clinical diagnosis"), nor `mental health`, nor `wellbeing` — those were added to the ban later, by this document, without cause. `stress` and `wellbeing` are back in the keyword field; `mental health` is allowed in the description body only. The claim that this "removes the category's highest-volume keyword pools permanently" is false: the reclaimed lanes (`emotional wellbeing`, `stress journal`) are both *softer* than the banned ones.
2. **We're a new app with few ratings.** Incumbents on the head terms are entrenched — `journal` top-10 average **75k** ratings, `mood tracker` **21k**, `diary` **22k**. We can *index* those terms but won't out-rank Daylio/Day One on them via keywords alone. Wins come from the **long-tail**, where relevance is high and the incumbent moat is shallow.
3. **Differentiation is the lever.** Kibun is the *cute, kawaii, Shiba-companion* mood diary. That lane (validated by Finch: 12.5M downloads, 4.9★, "self-care pet") is low-competition and non-clinical — exactly where a new app can win.

---

## 2. What the research data actually said

| Bucket | Example keywords | Decision |
|---|---|---|
| 🎯 Relevant + winnable | `habits tracker` (t84/d51, **0** top-10 title matches), `mood tracker`, `mood app`, `moods`, `emotions`, `mood habits` | Target. Mostly already indexed. |
| 🏔️ Relevant + entrenched | `journal` (d85, 75k ratings), `diary` (d83, 22k) | Index via combos only. Don't expect standalone rank. |
| 🚫 Competitor brand names | `moodstream`, `mood base`, `mood bubble`, `mood harmony`, `official mood app`, `mood ai`, `moodfit` | **Cannot legally target** (Apple suppresses/removes for trademarked terms). High scores are a mirage. |
| 🎨 Wrong intent ("mood board") | `mood board`, `mood board maker`, `mood board for interior design` | Design/collage intent (Morpholio, Canva, Pinterest). Would tank conversion. Avoid. |
| 📷 Wrong category | `mood.camera`, `moody radio`, `mood controller 2.0`, `moodle`, `shiba`, `people`, `find` | Noise. |
| ⌚ Aspirational | `mood app apple watch` | Relevant, but no Watch app exists. Park. |

**Standout row:** `habits tracker` — traffic 84, difficulty 51, and *zero* of the top-10 are title-optimized for the exact phrase. Highest genuinely-winnable + relevant opportunity in the sheet. We already index `habit` (keywords) + `tracker` (name) → the combo is live.

> **Caveat on the data:** the `traffic` column is bucketed (values cluster at 5/45/92/100; `mood`=5 while `mood tracker`=92 is backwards from reality). Treat it as coarse tiers. Trust **relevance + difficulty + `avg_ratings_top10`** (the incumbent moat) over raw traffic.

---

## 3. ASO rules applied (2026)

- Apple **stems English plurals** → use singular only; never spend chars on both `mood` and `moods`.
- **No repeats** across name / subtitle / keyword field — Apple already has those words and auto-combines single tokens into phrases (we don't need to add `mood journal`; `mood` + `journal` produces it).
- **No competitor trademarks** in the keyword field — risk is rank suppression on that term, up to app removal. Only generic sub-words are fair game.
- **Relevance feeds ranking via conversion.** Indexing for `sleep`/`calm`/`mood board` pulls impressions that bounce; low tap-through *depresses* standing on that keyword. Pruning irrelevant-but-tempting tokens is a net gain.

Sources: [AppTweak](https://www.apptweak.com/en/aso-blog/how-to-optimize-your-ios-keyword-field), [AppLaunchFlow](https://www.applaunchflow.com/blog/app-store-keyword-field-guide-2026), [Lexogrine](https://lexogrine.com/blog/app-store-keywords-optimization-ios-2026), [Gummicube](https://www.gummicube.com/blog/targeting-competitor-ios-app-brands-with-keyword-optimization/), [ScreenshotBro](https://screenshotbro.app/blog/app-store-keyword-research).

---

## 4. ENGLISH — keyword field change

**Indexed context (do not repeat these in the field):**
`kibun · mood · tracker · journal` (name) + `cute · daily · diary · self · care` (subtitle)

### Current (100 / 100)
```
emotion,feelings,wellness,gratitude,kawaii,habit,pattern,gentle,calm,sleep,mindful,breathing,joy,pet
```

### Proposed (97 / 100)
```
emotion,feelings,wellness,gratitude,kawaii,habit,log,reflect,companion,calm,mindful,breathing,pet
```

**Diff:** ➖ `pattern, gentle, sleep, joy`  ➕ `log, reflect, companion`

| Token | Action | Reason |
|---|---|---|
| `gentle` | ➖ cut | Brand-voice word, ~zero search demand. |
| `pattern` | ➖ cut | Too generic standalone; `mood pattern` is a micro-niche. |
| `sleep` | ➖ cut | Different category (`sleep tracker`); poor conversion match. |
| `joy` | ➖ cut | Weak generic single word. |
| `log` | ➕ add | We *are* a mood logger → `mood log`, `daily log`. High relevance, low comp. |
| `reflect` | ➕ add | `self reflection`, `reflection journal`. On-brand. |
| `companion` | ➕ add | `self-care companion`, `pet companion` — the Finch lane. |
| `pet` | ✅ keep | Alone it fights pet-care apps, but fuels the Finch-lane combos. Worth the bet. |
| `calm`, `mindful`, `breathing` | ✅ keep (watch) | Borrowed from the Calm/Headspace red ocean. Kept `breathing` (real feature); if a future pass needs slots, `calm`/`mindful` are the first cuts. |

**Alt variant** (grab UK spelling): swap `feelings` → `wellbeing` to capture `wellbeing tracker/journal` (a distinct token from `wellness`).

---

## 5. SPANISH — keyword field change

**Indexed context (do not repeat):**
`kibun · diario · emocional · kawaii` (nombre) + `rastreador · ánimo · hábitos` (subtítulo)

### Current (97 / 100)
```
emociones,bienestar,gratitud,respiración,mindfulness,calma,sueño,gentil,patrones,shiba,ritual,paz
```

### Proposed (95 / 100)
```
emociones,bienestar,gratitud,respiración,calma,autocuidado,mascota,compañero,reflexión,registro
```

**Diff:** ➖ `mindfulness, sueño, gentil, patrones, shiba, ritual, paz`  ➕ `autocuidado, mascota, compañero, reflexión, registro`

| Token | Action | Reason |
|---|---|---|
| `gentil` | ➖ cut | Brand-voice; no demand (mirror of EN `gentle`). |
| `patrones` | ➖ cut | Too generic standalone. |
| `sueño` | ➖ cut | Sleep-tracker category; poor conversion. |
| `shiba` | ➖ cut | Mascot, but search traffic is crypto/games — zero intent match. |
| `ritual`, `paz` | ➖ cut | Low-demand brand-voice words. |
| `autocuidado` | ➕ add | "self-care" — core category term, and the Finch lane (`mascota autocuidado`). |
| `mascota`, `compañero` | ➕ add | Companion/pet lane: `mascota virtual`, `compañero de bienestar`. |
| `reflexión` | ➕ add | `diario de reflexión`, `autorreflexión`. |
| `registro` | ➕ add | `registro de ánimo` (mood log) — mirrors EN `log`. |
| `mindfulness` | ➖ cut (optional) | Red-ocean; cut for space. If preferred over `calma`, swap them back. |

> Spanish stemming on Apple is weaker than English — keeping the natural plural (`emociones`, `patrones`) is intentional; don't "correct" to singular blindly.

---

## 6. What we are NOT changing (and why)

- **App name** `Kibun: Mood Tracker Journal` — front-loads brand + the two biggest generics. Name changes carry the highest ranking-reset risk; no 3-char win justifies it.
- **Subtitle** `Cute daily diary & self-care` — already well-built (`cute/daily/diary/self/care` all index). *Optional A/B only:* `Cute daily diary & mood log` (26/30) introduces `log` at the human level but trades away `self-care`. Test only if willing to accept a short subtitle re-index.
- **Description / screenshots** — held verbatim from V3 for continuity.

---

## 7. Google Play note

Play has **no keyword field** — ranking comes from title (30), short description (80), and keyword *density* in the long description (4000). The same lane logic applies: weave `cute`, `kawaii`, `companion`, `self-care`, `mood log`, `gratitude`, `habit tracker` naturally into the long description; drop the clinical terms. Track this in a separate Play pass if/when we revisit `ASO/V*/play-store-submission.md`.

---

## 8. The real growth lever: long-tail (next research batch)

The CSV was all head terms — the wrong altitude for a low-rating app. The winnable, high-conversion demand lives in the long-tail. A target list to feed back into the ASO tool ships alongside this doc:

→ **`aso-keywords-us-longtail-targets.csv`** (kawaii/cute · companion/pet · log/core-intent · reflection/gratitude · habit lanes)

Prioritize confirming difficulty on the **kawaii** and **self-care pet / companion** lanes first — that's Kibun's structural advantage.

---

## 9. Submission checklist

- [ ] Paste EN field (97/100) into App Store Connect → English (U.S.) → Keywords.
- [ ] Paste ES field (95/100) into Spanish (Mexico) **and** Spanish (Spain) localizations.
- [ ] Confirm no field exceeds 100 chars after paste (App Store Connect counts live).
- [ ] Leave name, subtitle, description, screenshots untouched.
- [ ] Note the submission date here for the next pass to measure keyword movement against.
- [ ] ~4–6 weeks post-release: pull rankings for `mood log`, `cute mood tracker`, `self care companion`, `habit tracker` to validate the new tokens.

---

## 10. What changed from V3

| V3 (live) | V4 (proposed) |
|---|---|
| EN keywords: `…,pattern,gentle,…,sleep,…,joy,pet` | `…,log,reflect,companion,…,pet` (cut 4 dead tokens, added 3 core-intent) |
| ES keywords: `…,sueño,gentil,patrones,shiba,ritual,paz` | `…,autocuidado,mascota,compañero,reflexión,registro` |
| Everything else | Unchanged |

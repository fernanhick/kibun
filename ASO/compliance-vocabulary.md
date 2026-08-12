# Compliance vocabulary — what we can and can't say

**Date:** 2026-07-29
**Purpose:** settle, with evidence, which words the blanket ban removed unnecessarily and which must stay out. The ban was over-applied — but not by as much as it first looked, and the reasons matter.

**Method:** re-read the actual rejection record (`docs/app-store-submission.md` §9b), then pulled the **live** App Store descriptions of four direct competitors and extracted every sentence containing a flagged term, plus Apple search-API rank probes on each reclaimable lane.

---

## 1 · What Apple actually rejected

Build 1.0(13), Submission `ad08bcc1`, 2026-05-07, Guideline 1.1. Four specific triggers were identified:

| # | Where | Trigger |
|---|---|---|
| 1 | **Keyword field** | `anxiety`, `depression`, `therapy` — condition names + a treatment term |
| 2 | Description | "trying to understand **anxiety**" — framed the app as helping a named condition |
| 3 | Description | "feels warm instead of **clinical**" — flagged even though it was a *positive contrast* |
| 4 | Description | "Breathing & **Grounding** — box breathing, **5-4-3-2-1** … **triggered when you need them most**" — named clinical technique + symptom-intervention framing |

Two things follow from this that got lost afterwards:

- **Trigger #3 tells us the screening was partly literal, not purely semantic.** `clinical` was flagged in a sentence that disclaimed being clinical. That justifies real caution — but only for the specific flagged tokens.
- **The original fix explicitly KEPT `stress`**, reasoning it is "usually accepted as an emotional state, not a clinical diagnosis."

---

## 2 · Where the ban over-reached

Three terms were added to the ban list *after* the rejection, by later documents, without Apple ever having flagged them:

| Term | Apple flagged it? | On the §9b "do not reintroduce" list? | Banned by | Verdict |
|---|---|---|---|---|
| `stress` | ❌ No — explicitly kept | ❌ No | `ASO/V4/keyword-strategy.md` §1 | **Reclaim — this is a straight internal contradiction** |
| `mental health` | ❌ No | ❌ No | `ASO/V4/*` compliance checklist | **Reclaim, description body only** |
| `wellbeing` / `emotional wellbeing` | ❌ No | ❌ No | never formally, just avoided | **Reclaim** |

The `mental health` ban appears to be a **conflation of two different things**: Play's *"Mental health" content tag* (which genuinely does trigger a Health Content policy review, and should still be avoided) with the *phrase* "mental health" in ordinary copy (which does not).

---

## 3 · What competitors actually say — live, today

Pulled from live App Store descriptions on 2026-07-29. All four sit in the same **Lifestyle / Health & Fitness** pairing Kibun uses.

**Tochi** — 843 iOS ratings, Lifestyle primary. The most aggressive by a wide margin:
> "Your All-in-One **Mental Health** Journal & Mood Tracker App"
> "Whether you need an **anxiety** journal, a **stress** journal, or a gratitude journal…"
> "From managing **depression**, **bipolar disorder**, and **ADHD** to navigating burnout…"
> "**CBT**-inspired guided prompts help you process feelings, manage **anxiety**…"
> "Versatile **bipolar** mood tracker, **ADHD** diary, and **depression** support."

**Daylio** — 60,828 ratings:
> "Your **mental health** coach."
> "Good self-care is a key to improved mood and reduced **anxiety**."
> "For **anxiety** and **stress** relief…"

**Finch** — 732,674 ratings:
> "Struggling with **stress**, **mental health**, or need motivation?"
> "improve **mental health**!"
> "quizzes to understand your **mental health** by tracking your **anxiety**, **depression**, body image…"

**DailyBean** — 70,058 ratings, the most conservative:
> "a **mental health** journal to manage your emotions"
> "Understand your **mental health** with easy-to-read charts."

**All four use `mental health`. Three of four use `stress`. Three of four use `anxiety`.**

---

## 4 · The asymmetry you must not ignore

It's tempting to read §3 as "everyone does it, so we can." That's wrong, for one specific reason:

> **Kibun has a Guideline 1.1 rejection on file. None of these competitors do (as far as we can observe).**

Once an app has been flagged, later submissions get closer scrutiny, and a second rejection on the same guideline is materially worse than the first — it costs review cycles at exactly the moment we're trying to establish ranking. Tochi is *not* a grandfathered giant (843 ratings), so age alone doesn't explain it — but Tochi also never triggered a reviewer.

**The good news is that this barely costs us anything**, because of §5.

---

## 5 · The lanes are ranked opposite to the risk

Apple search-API probes, US, 2026-07-29 — top-7 rating counts:

| Lane | Competition | Risk to us | Verdict |
|---|---|---|---|
| `emotional wellbeing` | **Soft** — #3 has **0** ratings, #6 has 70, #7 has 1 | **Low** | ✅ **Take it** |
| `stress` (as `stress journal` / `stress diary`) | `stress tracker` top results are HRV/watch monitors — *different intent*, journaling side is largely unoccupied | **Low** | ✅ **Take it** |
| `mental health journal` | Entrenched — 6,905 to 732,674 | Low-med | ✅ Index via description only |
| `anxiety` | Entrenched — Daylio 60k, Finch 732k, Tochi fights it | **High (rejection on file)** | ❌ **Skip** |
| `depression` | Entrenched | **High** | ❌ **Skip** |
| `mental wellness` | Headspace 973k, "I am" 724k | Low-med | ❌ Not winnable, skip |
| `burnout` | **Contaminated** — top results are *racing games* (Torque Burnout, Need for Speed) | Low | ❌ Useless, skip |

**The two safest reclaims are also the two softest lanes.** The two riskiest terms are the two most entrenched. There is no painful trade-off here — the risk-adjusted answer is simply to take `wellbeing` and `stress`, mention `mental health` once in the description body, and leave `anxiety`/`depression` to the incumbents who are already bleeding on them.

---

## 6 · The three-tier list (use this from now on)

### 🟢 TIER 1 — Safe. Use freely, anywhere.
`mood` · `emotion` · `emotions` · `feelings` · `wellness` · `wellbeing` · `emotional wellbeing` · `stress` · `self-care` · `journaling` · `gratitude` · `mindful` · `reflection` · `self-reflection` · `habits` · `calm` · `breathing` · `patterns` · `check-in`

### 🟡 TIER 2 — Allowed, with placement rules.
| Term | Rule |
|---|---|
| `mental health` | **Description body only.** Never in the app name, subtitle, iOS keyword field, or as a Play tag. Frame as a category ("a mental health journal"), never as an outcome ("improve your mental health"). Max ~2 uses. |
| `mental wellness` | Same rule. Lower value — probably not worth a slot. |
| `AI` | ✅ **Resolved 2026-07-29** — removed from the app too, so store and product now match. See §8. |

### 🔴 TIER 3 — Never. Non-negotiable.
Condition names: `anxiety` · `depression` · `panic` · `PTSD` · `ADHD` · `OCD` · `bipolar` · `trauma` · `disorder`
Treatment/clinical claims: `therapy` · `therapeutic` · `treat` · `cure` · `heal` · `healing` · `diagnose` · `clinical` · `medical`
Named techniques: `grounding` · `5-4-3-2-1` · `EMDR` · `CBT` · `DBT` · `exposure therapy`
Symptom-intervention framing: `triggered when you need them most` · `relief from` · `combat` · `cope with [condition]`

> These remain safe **only** in disclaiming form — the onboarding disclaimer, privacy policy §9, and support FAQ ("Kibun is NOT a medical app / therapy / treatment").

---

## 7 · What changes as a result

### iOS keyword field — EN
```
emotion,feelings,gratitude,kawaii,habit,log,reflect,companion,shiba,stress,wellbeing,breathing,pet
```
**[98 / 100]** — added `stress` + `wellbeing`; dropped `calm` and `wellness`.
`calm` was already marked in `keyword-strategy.md` as "first to cut if slots are needed" (red-ocean, Calm/Headspace). `wellness` gives way to `wellbeing`, which V4 itself noted is a **distinct token** and which sits on the softest lane we found.

### iOS keyword field — ES
```
emociones,bienestar,gratitud,respiración,calma,estrés,autocuidado,mascota,reflexión,registro,shiba
```
**[98 / 100]** — added `estrés`. `bienestar` already covers wellbeing/wellness in Spanish, so no swap needed and `calma` survives.

### Description body — add these, all Tier 1 or Tier 2-compliant

Weave in naturally, not stuffed:
- *"a gentle **stress** and mood journal"* — Tier 1, reclaims the lane
- *"track your **emotional wellbeing** over weeks and months"* — Tier 1, softest lane
- *"a **mental health** journal that never feels like homework"* — Tier 2, **one use**, category-framing not outcome-claiming
- Keep the existing wellness disclaimer paragraph **exactly as is** — it's what makes the above defensible

### Do NOT change
App name, subtitle, Play title, Play tags. All Tier 2/3 terms stay out of every one of those.

---

## 8 · The unresolved `AI` inconsistency

This is currently incoherent and needs a decision either way:

- **Store copy** scrupulously avoids "AI" — the competitive analysis calls AI-led positioning "a rejection trap for new apps."
- **The app says it out loud.** `screens.json` ships `"AI journaling prompts"`, `"AI mood reports"`, `"Unlock a personalised AI narrative of your {{year}}"`, and the ES `"narrativa de IA"`. A reviewer with a Pro entitlement sees all of it.
- The claims are **true** — it's OpenAI GPT-4o-mini via a Supabase Edge Function.

The `ai journal` lane is real and has a soft tail (Rosebud 3,195 · Lightpage 293, under Reflectly's 81,703). But the §9b record shows the original rejection was partly about **AI-therapy framing**, and the in-app footprint compounded the metadata signal last time.

### ✅ RESOLVED 2026-07-29 — option (a) shipped

The in-app strings were renamed across **all four locales**, removing the reviewer-facing AI footprint entirely:

| Key | Before (en) | After (en) |
|---|---|---|
| `paywall.comparison.rows.aiPrompts` | AI journaling prompts | **Personalized prompts** |
| `paywall.comparison.rows.aiReports` | AI mood reports | **Mood reports** |
| `annualReport.unlockStoryHint` | …unlock your **AI** story. | …unlock your story. |
| `annualReport.upgradeA11y` | …Year in Words **AI** narrative | …Year in Words narrative |
| `annualReport.upgradeSubtitle` | a personalised **AI** narrative | a personalized narrative |

Spanish/Portuguese `IA` and German `KI` variants renamed to match. Verified: **zero** user-visible `AI` / `IA` / `KI` strings remain in any of the 24 locale files. Key parity holds at 792 leaf keys per locale; only the 5 intended values changed.

The i18n **keys** (`aiPrompts`, `aiReports`) were deliberately left alone — keys are never rendered, and renaming them would mean touching `paywall.tsx` for no compliance gain. Same for the `{/* AI Narrative */}` code comment in `annual-report.tsx`.

The app and the store listings now say the same thing. Option (b) — claiming AI and targeting `ai journal` (soft tail: Rosebud 3,195 · Lightpage 293) — remains available later, but only **after** screenshots and titles have been measured, and never bundled with another change, so a rejection stays attributable.

---

## 9 · Fix the internal contradiction

`ASO/V4/keyword-strategy.md` §1 lists `stress` among terms "banned from all copy". `docs/app-store-submission.md` §9b says `stress` was deliberately **kept**. The submission record is the authority — it's the one derived from what Apple actually said. `keyword-strategy.md` should be corrected, and this file is now the single source of truth for vocabulary decisions.

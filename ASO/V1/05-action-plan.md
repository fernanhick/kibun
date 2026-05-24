# 30-Day Action Plan (compliance-safe)

A concrete week-by-week rollout for relaunching post-rejection. Every action is small enough to ship in 1-3 hours. Order matters — front-loading the highest-leverage moves means you start seeing data faster.

> **Rewrite note:** since the previous version of the listing was rejected, week 1 includes a **compliance-clean audit step** before any submission. Don't skip it.

---

## Week 0 — Compliance audit (do BEFORE submitting)

This is the rejection-avoidance step. ~2-3 hours total.

### Day 0
- [ ] Open the rejection email/note from Apple/Google. Identify the **exact guideline cited** (likely 1.4.1 Medical, 4.5.5 AI Misrepresentation, or Play's Health Content / Sensitive Events policies).
- [ ] Read the listing copy in `03-app-store-en.md`, `03-app-store-es.md`, `04-play-store-en.md`, `04-play-store-es.md`. Find any banned vocabulary from `README.md`'s "Banned vocabulary" section (there should be none — but verify after any tweaks you've made).
- [ ] Audit your **in-app strings** too — the reviewer reads the app, not just the listing. Check:
  - Onboarding screens
  - Paywall copy
  - Push notification copy
  - Settings labels
  - Any AI/clinical mention here will get you re-rejected even if the listing is clean.
- [ ] Verify the **disclaimer is visible in-app**, not just in the description. Currently in `disclaimer.tsx` — good. Make sure it shows for new users.

### Day 0 — In-app code audit checklist

Search the codebase for these strings and rephrase any user-visible ones:

| Term in code | Risk | Action |
|---|---|---|
| `AI`, `ai`, `Ai`, `IA` | Direct AI claim | Remove from user-visible strings; OK in code comments / variable names |
| `sentiment`, `Sentiment` | Implies ML/AI | Rephrase user-visible occurrences to "tone" or "reflection" |
| `analyze`, `analysis`, `analiza`, `análisis` | Implies clinical/AI | "view", "see", "patterns" |
| `predict`, `prediction`, `predecir` | Implies AI | "tends to", "often" |
| `diagnose`, `diagnosis`, `diagnóstico` | Medical claim | Remove entirely |
| `treat`, `therapy`, `tratar`, `terapia` | Medical claim | Remove entirely |
| `anxiety`, `depression`, `ansiedad`, `depresión` | Symptom-led | Rephrase to "heaviness", "low days", "feel down" |
| `mental health`, `salud mental` | Clinical category | "emotional wellness" / "bienestar emocional" |

```bash
# Run this from project root to audit:
grep -ri "anxiety\|depression\|panic\|therapy\|cbt\|mental health\|sentiment\| ai \| ia \|analyze\|predict" src/i18n/locales/
```

If any hit appears in a user-visible string file, rephrase.

---

## Week 1 — The "free wins"

Pure-metadata changes. No new screenshots needed. **Approval typically takes 1-3 days each.**

### Day 1
- [ ] **App Store (iOS) — EN:** Update name, subtitle, keywords, promotional text, description per `03-app-store-en.md`. Switch category to **Lifestyle**.
- [ ] **App Store (iOS) — ES:** Same per `03-app-store-es.md`. Switch category to **Lifestyle**.
- [ ] **Google Play — EN:** Update title, short description, full description per `04-play-store-en.md`. Switch category to **Lifestyle**. Remove `Mental health` tag.
- [ ] **Google Play — ES:** Same per `04-play-store-es.md`.
- [ ] **Attach reviewer notes** in both App Store Connect and Play Console (see §8/§9 of each store file).
- [ ] Submit for review on both stores.

### Day 2-5 (waiting for review)
- [ ] Spec out 8 screenshots using `02-screenshots.md`. Build a Figma template.
- [ ] If you don't have a designer, brief a screenshot tool (Screenhance, AppLaunchpad, AppScreens). 24-72 hour turnaround.
- [ ] Verify your ratings count for trust badges in Screenshot 1.

### Day 6-7
- [ ] Once metadata is live, **screenshot your own listing** as a "before" baseline.
- [ ] Note current rank for: `kibun`, `mood tracker`, `mood journal`, `cute mood tracker`, `kawaii journal`, `diario emocional`, `rastreador de ánimo`, `diario kawaii`.
- [ ] Free tools: AppFollow, AppTweak free tier, Sensor Tower free tier.

> **Expected by end of week 1:** Visibility lift of 20-40% for new keyword combinations within 5-10 days. **And — critically — no rejection.**

---

## Week 2 — Screenshots ship

### Day 8-10
- [ ] Build all 8 EN screenshots per `02-screenshots.md`. Use the compliance-safe copy.
- [ ] Build feature graphic (1024×500).
- [ ] Internal review — does each frame work as a thumbnail? (zoom to 25%)
- [ ] **Verify zero AI/clinical mentions in any rendered text.**

### Day 11-12
- [ ] Localize copy to Spanish. **Use a native LATAM speaker.**
- [ ] Rebuild all 8 frames + feature graphic in Spanish.

### Day 13-14
- [ ] Upload to App Store Connect (8 screenshots × 2 languages × 1-2 device sizes).
- [ ] Upload to Play Console (8 screenshots × 2 languages + feature graphic).
- [ ] Submit for review.

> **Expected by end of week 2:** Conversion rate lift of 15-30%. Hero screenshot does most of the work.

---

## Week 3 — Start the experiment loop

### Day 15-16
- [ ] **Play Console Store Listing Experiments — Test 1:** Short description. Run all 4 variants from `04-play-store-en.md` against current.
- [ ] **App Store Product Page Optimization:** Same kind of test on iOS for screenshot 1 headline.

### Day 17-21
- [ ] **Monitor early signals.** Don't kill tests early — min 14 days each.
- [ ] Track daily in a simple spreadsheet:
  - Impressions (search + browse)
  - Page views
  - Installs
  - Conversion rate
  - Rank for top 10 keywords

### Day 22 — Friday review
- [ ] What's working? What's stalled? One thing to change next week.

> **Expected by end of week 3:** First experiment results. Likely winner: short description variant with `cute mood tracker` upfront.

---

## Week 4 — Compound the wins

### Day 23-25
- [ ] Promote the winning short description from Test 1 to control.
- [ ] Start **Test 2: First screenshot variants.**
- [ ] Build a **promo video** for Play Store (optional, +7-10% conversion historically). 30 seconds, daily check-in flow, end with Shiba waving. **No AI / clinical mentions in voiceover or text overlays.**

### Day 26-28
- [ ] Audit in-app rating prompt timing. **Show after 3rd successful check-in, not on first launch.**
- [ ] Reach out to ~10 small wellness / kawaii / Shiba content creators on TikTok/Instagram. Offer free Pro lifetime for honest review. Aim for 2-3 takers.

### Day 29-30
- [ ] **One-month review.** Compare:
  - Daily installs (Day 1 vs Day 30)
  - Rank for top 10 keywords
  - Conversion rate
  - Ratings volume + average
- [ ] Plan Month 2.

---

## What "good" looks like at 30 days

| Metric | Day 0 baseline | Day 30 target |
|---|---|---|
| Daily organic installs | (whatever it is) | **+150-300%** |
| Rank for `mood tracker` (US) | Likely unranked / 100+ | **30-60** |
| Rank for `mood journal` (US) | Likely unranked | **20-40** |
| Rank for `cute mood tracker` (US) | Likely unranked | **Top 10** |
| Rank for `kawaii journal` (US) | Likely unranked | **Top 5** |
| Rank for `diario emocional` (MX/ES) | Likely unranked | **15-30** |
| Rank for `diario kawaii` (MX/ES) | Likely unranked | **Top 5** |
| Listing conversion rate | ? | **+20-40%** lift |
| Avg rating | ? | Maintain ≥ 4.6 |
| **Rejection rate** | 100% (previous submission) | **0%** |

The biggest wins come from **long-tail kawaii / shiba / cute / private** keywords where there's almost no competition — and these are also the safest keywords from a review perspective.

---

## What this doesn't fix

ASO is **discovery + conversion**. It cannot fix:

- **Retention.** If users churn at day 1, ASO drives wasted impressions. Audit onboarding if D1 retention < 40%.
- **Monetization.** If free→Pro conversion < 2-3%, optimize the paywall separately.
- **Crashes / 1-star reviews.** A flood of 1-star reviews crushes ASO faster than any keyword strategy can lift it.
- **Product-market fit problems.** Daylio + Finch being huge tells you the market is real — make sure your check-in flow is genuinely smoother/cuter than theirs.

---

## When to revisit this plan

- **Every 90 days** as default.
- **Immediately after** any major feature release.
- **Immediately after** any Apple/Google policy change (especially AI claims policy — this area is evolving fast in 2026).
- **If installs drop > 30%** week-over-week.

---

## If you ever want to add AI/clinical positioning back

If at some point you want to legitimately market AI features or specific clinical audiences, you need to:

1. **For AI:** Demonstrate the feature works as described. Apple's 4.5.5 policy specifically requires the AI claim to be accurate and verifiable. The on-device sentiment model in `src/lib/sentiment/` would qualify IF you market it specifically as "on-device emotional language analysis" with clear scope — but it's not worth the rejection risk pre-1k installs. Wait until you have a track record.

2. **For clinical positioning:** Apply for Health/Medical app status with both stores. This requires HIPAA-adjacent disclosures, evidence of clinical efficacy claims (if any), and often a partnership with a licensed clinical organization. Out of scope for Kibun as a wellness brand.

**The wellness-lifestyle positioning in this folder is the right long-term strategy** for a kawaii Shiba mood diary. You're not giving anything up — you're just describing what the app actually is in the language Apple and Google will approve.

---

## File checklist — what to use when

| Doing this? | Use this file |
|---|---|
| Pasting metadata into App Store Connect (English) | `03-app-store-en.md` |
| Pasting metadata into App Store Connect (Spanish) | `03-app-store-es.md` |
| Pasting metadata into Play Console (English) | `04-play-store-en.md` |
| Pasting metadata into Play Console (Spanish) | `04-play-store-es.md` |
| Briefing a designer for screenshots | `02-screenshots.md` |
| Picking which keywords to test or revisit | `01-keywords-en.md` / `01-keywords-es.md` |
| Explaining the strategy / compliance angle | `README.md` + `06-competitive-landscape.md` |
| Tracking your progress / re-submission | This file |

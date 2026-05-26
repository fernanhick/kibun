# kibun onboarding — initial audit (v1)

**Date**: 2026-05-26
**Mode**: audit (code-only; no analytics or screenshots supplied)
**Win condition (user-stated)**: aha moment + trial start + conversion
**Locked / non-cuttable**: disclaimer screen, all 7 profile screens (re-ordering and merging allowed)
**Skill reference**: `~/.claude/skills/onboarding-architect/references/strategy-library.md` (S* codes below)

---

## 1 — Flow as it ships today

14 declared steps in the progress bar, **16 actual user-facing screens** including the analyzing handoff and forced paywall:

| # | Route | Job | Progress shown |
|---|---|---|---|
| 1 | `disclaimer.tsx` | Legal disclaimer + acknowledge checkbox + login link | 1/14 |
| 2 | `first-mood.tsx` | Pick first mood from grid (hands-on) | 2/14 |
| 3 | `mood-response/[moodId].tsx` | Shiba reacts to chosen mood + empathic line | 3/14 |
| 4 | `wisdom-awareness.tsx` | Static psychoeducation: "naming what you feel" | 4/14 |
| 5 | `profile-personal.tsx` | Name + age + gender | 5/14 |
| 6 | `profile-work.tsx` | Employment + (setting + hours when employed) | 6/14 |
| 7 | `profile-physical.tsx` | Sleep + exercise | 7/14 |
| 8 | `wisdom-mind-body.tsx` | Static psychoeducation: "body keeps the score" | 8/14 |
| 9 | `profile-social.tsx` | Social frequency (1 question) | 9/14 |
| 10 | `profile-mental.tsx` | Stress baseline (1 question) | 10/14 |
| 11 | `profile-coping.tsx` | Coping chips (multi-select) | 11/14 |
| 12 | `profile-goals.tsx` | Goals chips (multi-select) | 12/14 |
| 13 | `wisdom-small-shifts.tsx` | Static psychoeducation: "big change rarely happens at once" | 13/14 |
| 14 | `notification-permission.tsx` | Slot pre-pick + native prompt; **silently logs first mood + persists profile** | 14/14 |
| 15 | `analyzing.tsx` | 4-step animated loader (~3.25s) → handoff to `(tabs)` | — |
| 16 | `paywall.tsx` | Hard paywall (forced via tabs gate: `paywallSeen=false → redirect`) | — |

Gate: `(tabs)/_layout.tsx` redirects to `/(onboarding)/disclaimer` if `!complete`, and to `/paywall` if `complete && !paywallSeen`. Registration sits after paywall purchase; anonymous users land on tabs with a sign-up banner.

---

## 2 — Per-screen verdict

Verdict scale: **Keep** · **Change** (content/UX) · **Move** (reposition in flow) · **Cut**

| # | Screen | Verdict | Strategy fit | Why |
|---|---|---|---|---|
| 1 | disclaimer | **Keep (compress)** | — | Legally required and you locked it. But 5 bullets + crisis box + checkbox = heavy first impression. Consider accordion-collapsing the "NOT" bullets behind a "What this means" toggle. |
| 2 | first-mood | **Keep (anchor)** | S3.1 hands-on aha ✓ | The right screen-2. User does the core action before any data ask. Best beat in the current flow. |
| 3 | mood-response | **Keep (extend)** | S2.4 reflection mirror ✓ | Shiba variant + empathic phrase is on-strategy. But it's a single beat that never threads forward — the chosen mood is silent for 12 screens until `maybeLogFirstMood()` quietly fires. **Re-surface this mood on the analyzing screen and paywall hook**. |
| 4 | wisdom-awareness | **Cut** | — | Static headline + body, no interaction, no personalization, no name use. Pure psychoeducation. Doesn't earn its screen (S1.4 caveat). |
| 5 | profile-personal | **Change (move name to screen 2)** | S2.1 violated | Name collected at screen 5, then **never used anywhere downstream**. No "Hi Alex" on mood-response, no name in analyzing steps, no name on paywall. Move name input to a 1-field micro-screen between first-mood and mood-response (or inline on mood-response), keep age + gender here. |
| 6 | profile-work | **Keep** | S2.2 ✓ | Conditional reveal of setting/hours is good UX. Title "How do you work?" is fine. |
| 7 | profile-physical | **Keep** | S2.2 ✓ | Sleep + exercise on one screen is the right density. |
| 8 | wisdom-mind-body | **Cut** | — | Same as #4: no interaction, no personalization. The fact that it sits between physical and social suggests it's a "breather" — but the cost is a tap-to-skip with no payoff. |
| 9 | profile-social | **Merge with #10 (mental)** | S2.2 anti-pattern | A single-question screen wastes a tap. "Social life" and "stress baseline" can sit on one screen — both are 1-question pickers. Consolidate. |
| 10 | profile-mental | **Merge with #9 (social)** | — | See above. Title for combined: "How are things outside of work?" with two pickers. |
| 11 | profile-coping | **Merge with #12 (goals)** | — | Both are chip-pickers with identical layout. Could become one screen: top half = "What helps when things feel heavy" / bottom half = "What you're hoping for". Saves 1 screen, narrative still distinct. |
| 12 | profile-goals | **Merge with #11 (coping)** | — | See above. Also: **goals is the strongest commitment signal in the entire flow** and is currently followed by a wisdom interstitial then a notification ask — the worst possible use of that energy. The paywall should reference these goals directly (S6.7). |
| 13 | wisdom-small-shifts | **Cut, replace with reflection mirror** | S2.4 missing | Right slot in the flow (post-profile, pre-permission) but wrong content. **Replace with a personalized reflection screen** that echoes 2-3 profile answers back ("Alex, you sleep 6–7h and your baseline stress is high — here's what we'll watch for you"). Keeps the screen count where this currently sits; upgrades the content. |
| 14 | notification-permission | **Keep (extract side-effects)** | S5.1 ✓, S5.2 ✓ | Pre-prompt with custom slots + skip option is on-strategy. **But** it carries 4 hidden side-effects: logs first mood, persists profile to Supabase, sets onboarding-complete, schedules notifications. If the user skips, those still fire — good. If permission API throws, everything proceeds — good. **One concern**: `setComplete()` fires before `analyzing.tsx` mounts, which means the user could background the app during the analyzing animation and lose the loader experience entirely. Minor; not blocking. |
| 15 | analyzing | **Change (personalize steps)** | S3.5 partial | Loader + ring + 4-step animation is well-built. **But the 4 steps are generic strings** ("Reading your profile", "Aligning your reminders", "Preparing your insights", "Drafting your daily plan"). Replace with steps that echo real answers: "Noted: 6–7h sleep · weekly exercise", "High stress + 4 coping moves saved", "Watching: morning & evening", "Your first 14 days". This is the cheapest single-file win in the audit. |
| 16 | paywall | **Change (personalize hook + add pre-paywall snapshot)** | S6.1 ✓, S6.4 missing, S6.7 missing | Comparison table + 5 stars + trial price + skip option is structurally correct. **But the headline and pitch are 100% generic** — no name, no goal, no profile reference. After 7 profile screens this is the single largest miss in the audit. Two interventions: (a) insert one pre-paywall snapshot screen (S6.4): "Your kibun plan — 3 patterns to watch this week"; (b) inject name + top goal into paywall headline: "Alex, your {top goal} plan starts here". |

**Not in `(onboarding)/` but part of the funnel:**

- `register.tsx`: gated post-paywall-purchase. Deferred signup (S5.5) is correct. Anonymous skip → tabs with `home.anonBanner` recovery prompt is the right fallback.

---

## 3 — Top 5 fixes, ranked by expected lift

Hypotheses are directional; specific lift % require analytics you don't have yet. Numbers below cite strategy-library sources where available.

### Fix 1 — Personalize the paywall (S6.7) + add pre-paywall snapshot (S6.4)
**Where**: insert a new screen between `analyzing` and `paywall`; update `paywall.tsx` hero + comparison-table title.

**What changes**:
- New screen: "Your kibun plan" — shows name, top goal, top coping move, one data summary ("Sleep: 6–7h · Stress: high · Goal: reduce stress"). Single CTA "Unlock your plan →" to paywall.
- Paywall hero: "{name}, your {topGoal} plan is ready" instead of generic "Thrive 🌸".
- Comparison table header row: "Free" vs "Your kibun" instead of "Free" vs "Premium".

**Hypothesis**: If we inject profile data into the paywall, then **trial-start rate** moves +10–25% because users see the 7-screen investment reflected at the decision moment (S1.4 loss aversion compounds with S6.7 personalization). Industry: personalized paywall hooks are the highest-converting paywall format when personalization is real.

**Guardrail**: paywall-view rate (must not drop — pre-paywall snapshot adds 1 screen).
**Primary metric**: paywall_subscribe_tap / paywall_view.
**Why first**: highest revenue lever; ships without changing the 7-screen profile capture you locked.

---

### Fix 2 — Cut all 3 wisdom screens, replace one with a reflection mirror (S2.4)
**Where**: delete `wisdom-awareness.tsx`, `wisdom-mind-body.tsx`, `wisdom-small-shifts.tsx`. Add `reflection.tsx` in the slot where `wisdom-small-shifts` currently sits (post-goals, pre-notification).

**What changes**:
- Wisdom screens deleted; navigation re-wired:
  - `mood-response/[moodId].tsx` → push to `/profile-personal` (was `/wisdom-awareness`)
  - `profile-physical.tsx` → push to `/profile-social` (was `/wisdom-mind-body`)
  - `profile-goals.tsx` → push to `/reflection` (was `/wisdom-small-shifts`)
- New `reflection.tsx`: Shiba (variant matched to user's first mood) + 3 echoed answer chips ("You sleep 6–7h", "Stress: high", "Your goal: reduce stress") + 1 line that ties them ("That's exactly what Kibun is built for, Alex.") + Continue CTA.

**Hypothesis**: If we cut psychoeducation interstitials and replace one with a personalized mirror, then **overall completion rate** improves by ~5–15% because perceived length drops while emotional investment rises (S1.4 + S2.4). Wisdom screens currently lose users to "skip-tap fatigue" with zero offset.

**Guardrail**: drop-off rate on `reflection.tsx` itself (must not exceed the average of the 3 wisdom screens it replaces — likely it won't, because mirror screens consistently outperform static psychoeducation in industry data).
**Primary metric**: onboarding_complete / disclaimer_view.
**Why second**: shortens the flow visibly (the user's stated concern) and adds the missing aha beat (the user's stated win condition).

---

### Fix 3 — Personalize the analyzing loader (S3.5)
**Where**: `analyzing.tsx`, lines 26 + 84-91 (STEP_KEYS array + step labels) and `onboarding.json` `analyzing.steps.*`.

**What changes**:
- Replace generic step strings with templated strings that read from the onboarding store:
  - `profile` → "Read: {sleepLabel} · {exerciseLabel}"
  - `reminders` → "Reminders aligned with your routine"
  - `insights` → "Watching: {topGoal}"
  - `plan` → "{firstName}, your first 14 days are drafted"
- Increase POST_FINISH_HOLD_MS from 450ms to ~900ms to let the last step land (currently flashes by).

**Hypothesis**: If the loader echoes the user's actual answers, then **paywall_view → paywall_subscribe** improves by ~3–8% because the user arrives at the paywall already feeling "this is mine, not a template." Tiny code change; high signal-to-noise.

**Guardrail**: time-to-paywall (must not exceed +500ms total).
**Primary metric**: paywall_subscribe_tap / paywall_view.
**Why third**: lowest implementation cost in the audit (one file + 4 i18n keys). Ships independently of Fixes 1 & 2.

---

### Fix 4 — Move name collection to screen 2 (S2.1) + thread through downstream
**Where**: extract name input from `profile-personal.tsx`, add 1-field micro-screen between `first-mood.tsx` and `mood-response/[moodId].tsx` (or inline on mood-response itself).

**What changes**:
- New `your-name.tsx` (or inline on mood-response): single TextInput, "What should Kibun call you?", Continue CTA. Auto-focus; max 50 chars; skipable to "friend" default.
- `mood-response/[moodId].tsx` headline becomes "{name}, that's a feeling worth noticing." instead of generic mood phrase.
- `analyzing.tsx` step `plan` becomes "{name}, your first 14 days are drafted".
- `paywall.tsx` hero becomes "{name}, your {topGoal} plan is ready" (composes with Fix 1).
- `profile-personal.tsx` keeps age + gender, drops the name field.

**Hypothesis**: If the name is collected early and used 3+ times before the paywall, then **completion rate** improves ~3–7% (Cialdini commitment & consistency; HubSpot/Prayer Lock cites early name as critical to 3x lift).

**Guardrail**: drop-off on the new name screen (must be < 5%; if higher, make it skipable with a "friend" default).
**Primary metric**: onboarding_complete / disclaimer_view.
**Why fourth**: depends on Fix 1 + Fix 3 to actually thread the name through; otherwise it's a tax with no payoff.

---

### Fix 5 — Consolidate profile screens 9-12 from 4 → 2
**Where**: merge `profile-social.tsx` + `profile-mental.tsx` into one screen; merge `profile-coping.tsx` + `profile-goals.tsx` into one screen.

**What changes**:
- New `profile-life.tsx`: title "How are things outside of work?", two pickers stacked — social frequency + stress baseline. No data loss; same OptionPicker component.
- New `profile-helps-and-hopes.tsx`: title "What helps and what you're hoping for", two chip-rows stacked — coping (top) + goals (bottom). No data loss; same chip pattern.
- Delete the 4 individual files; update navigation in `profile-physical.tsx` and `wisdom-mind-body.tsx` (already cut in Fix 2).

**Hypothesis**: If 4 single/sparse screens consolidate to 2 dual-question screens, then **profile-completion → notification-view** improves ~5–10% because perceived "form fatigue" drops without any data sacrifice. Single-question screens are a known anti-pattern (S2.2: light segmenting is 1-3 questions per screen).

**Guardrail**: per-field completion (each merged screen must not see < 95% completion on either field; if mental drops because it's "below the fold," reverse the order).
**Primary metric**: profile-goals_continue_tap / profile-personal_view (full profile-arc completion).
**Why fifth**: shortest visible win (4 screens → 2), but lowest-confidence on conversion impact because the audit can't model how users currently feel about the 4-vs-2 difference. Ship after Fixes 1-4 to attribute clearly.

---

## 4 — Recommended new flow (post-audit)

**14 declared → 10 declared screens (16 actual → 12 actual)**. All 7 profile questions preserved; disclaimer kept; aha + paywall conversion levers added.

| # | Screen | Source | New? |
|---|---|---|---|
| 1 | disclaimer | kept (compress optional) | — |
| 2 | first-mood | kept | — |
| 3 | your-name *(or name inline on #4)* | **new** (Fix 4) | ✨ |
| 4 | mood-response | kept (headline uses name) | — |
| 5 | profile-personal (age + gender) | kept, name removed | — |
| 6 | profile-work | kept | — |
| 7 | profile-physical | kept | — |
| 8 | profile-life (social + mental merged) | **new** (Fix 5) | ✨ |
| 9 | profile-helps-and-hopes (coping + goals merged) | **new** (Fix 5) | ✨ |
| 10 | reflection (echoes profile + first mood) | **new** (Fix 2) | ✨ |
| — | notification-permission | kept | — |
| — | analyzing | kept (personalized steps — Fix 3) | — |
| — | **plan-snapshot (pre-paywall)** | **new** (Fix 1) | ✨ |
| — | paywall (personalized hook — Fix 1) | kept | — |

(The progress bar `OnboardingProgress current/total` should be updated to reflect the new count and ideally extend through the analyzing + plan-snapshot screens so the user doesn't feel surprised by "two more after I thought it was over".)

---

## 5 — Open questions / dependencies

These are decisions the audit can't make for you:

1. **Name fallback**: if user skips the name screen, default to "friend" or to a translated equivalent per locale? (Spanish localization is mid-flight per memory — confirm both i18n bundles are covered.)
2. **Brand voice on emoji-heavy CTAs** ("Let's Go! 🎉", "Personalizing your Kibun"): are these deliberate brand decisions or candidates for A/B testing later? Audit treats them as locked.
3. **Reflection screen tone**: clinical-warm ("You sleep 6–7h") vs. character-warm (Shiba: "I noticed you sleep 6–7h — that matters")? Recommend the latter to extend the Shiba character into the post-profile beat.
4. **Pre-paywall plan-snapshot content depth**: 1 card with 3 chips, or 3 stacked cards with deeper data? Audit recommends 1 card to keep momentum to paywall; deeper exploration belongs in the paid product.
5. **Analytics**: until per-screen drop-off is wired (Vexo events fire on screen mount + CTA tap), the lift percentages above are directional only. Suggest instrumenting `onboarding_screen_view` + `onboarding_continue_tap` with `screen_name` property before shipping any of the 5 fixes — gives a baseline to measure against.

---

## 6 — What's NOT in scope of this audit

- Copy rewriting (recommendations above describe direction, not finalized headlines)
- Design / visual hierarchy (Shiba variants, color usage, typography are not assessed beyond strategy fit)
- Engineering effort estimation
- The post-onboarding home empty-states / anonymous banner (those are part of the activation funnel, not onboarding proper)
- Localization parity beyond noting that all changes need ES copy

---

## 7 — Next steps

Once you decide which of the 5 fixes to ship (and in what order), the natural follow-up is a **full Discover → Deliver loop** that produces a versioned spec for the rebuild — this writes `docs/onboarding/v2-…/spec.md` + `variants.md` + `CHANGELOG.md` describing the deltas from this v1 baseline.

To trigger: re-invoke the skill in full mode (no `audit` arg).

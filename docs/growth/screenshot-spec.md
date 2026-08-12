# Screenshot set — spec and capture guide

**Date:** 2026-07-29
**Why:** the live screenshots are the single biggest conversion problem (`docs/growth/2026-07-29-why-no-downloads.md` §3) **and** they show a build that no longer exists (§12). This replaces the whole set.

**Status:** design locked, pipeline built and smoke-tested. ⛔ **Blocked on 4 device captures — see §4.**

---

## 1 · The four benefits

Ordered so the set tells a story when swiped. Frame 1 carries the single biggest reason to download.

| # | Verb | Descriptor | Why this one |
|---|---|---|---|
| **1** | `PICK` | `FROM 18 SHIBA MOODS` | The differentiator, and the only thing no competitor can copy. Daylio has flat emoji, DailyBean has beans, Pixy has pixels. Also the strongest screen visually. |
| **2** | `TRACK` | `YOUR MOOD IN SECONDS` | The low-effort promise. The #1 objection to mood trackers is "I'll stop after a week." |
| **3** | `FIND` | `WHAT LIFTS YOUR MOOD` | The payoff — why anyone keeps logging. Habits → mood is the actual product value. |
| **4** | `KEEP` | `YOUR DIARY PRIVATE` | The wedge against Finch, which syncs everything to their cloud by default. Backed by real code (anonymous-first, RLS). |

Every headline is action-led, benefit-framed, and short enough to sit inside the horizontal safe zone.

**Deliberately not used:** "Add a Note, Track Energy and Focus Levels" and "Get Details of Your Patterns" — the current live headlines. Both describe mechanics rather than outcomes, and nobody searches for either.

---

## 2 · Brand colour — `#B0496A` (deep rose)

This is `colors.accent` from `src/constants/theme.ts` — a real brand token, not an invention.

Reasoning:
- **It differentiates in a results grid.** DailyBean owns flat green, Finch owns sky blue, Tochi owns cream. Nobody in this category owns rose.
- **It signals "cute" instantly**, which is the search lane we're targeting (`cute mood tracker`).
- **It contrasts hard with the app UI**, which is light beige `#F4EEE2` — so the phone screen pops rather than blending in.
- The primary sage `#4C7A6A` was the obvious alternative but is muted; muted backgrounds get lost at thumbnail size, and it sits close to DailyBean's green.

Same colour on all four frames. No gradients, no glows, no photographic backgrounds.

---

## 3 · Format

Locked to the pattern all three category leaders follow:

- **One flat background colour** across the whole set
- **One typeface** — **Fredoka Bold**, the app's actual display font, pulled straight from `node_modules/@expo-google-fonts/fredoka`. Three different fonts across four frames was a finding in the audit; using the real brand font fixes it at the source.
- **Headline top ~20–25%**, verb large, descriptor smaller beneath
- **Device centred, bleeding off the bottom edge**, never obstructed. The mascot does **not** sit in front of the phone — that's what buried the CTA in every current frame.
- **Output 1290 × 2796** (iPhone 6.7"), which App Store Connect accepts exactly

---

## 4 · ⛔ What I need from you — 4 captures

I can't produce these myself: there's no simulator/device in this environment, and the screenshots **must** come from the current sage/beige build. Everything else is ready.

Capture on a **6.7" iPhone** (or any iPhone — aspect ratio is what matters) from the **current build**, and drop the PNGs in `screenshots/captures/`.

| For frame | Capture this screen | Required state |
|---|---|---|
| 1 · `PICK` | The mood picker ("How are you feeling?") | Full 18-mood Shiba grid visible. This is the money shot — make sure every face is on screen. |
| 2 · `TRACK` | Home / today | **At least 3–4 check-ins already logged today**, ideally with a note on one. Never an empty state. |
| 3 · `FIND` | Insights | **Real data with a positive story.** ⚠️ Must NOT show `Recovery Score 24/100`, a red down-arrow, or five rows of "No pattern yet" — that's what's live now. Seed enough history that habit rows show actual correlations. |
| 4 · `KEEP` | History / calendar | A month with **most days filled** and colour variety. A sparse calendar reads as an abandoned app. |

**Before capturing:**
- Light mode, consistent across all four
- Clean status bar — full signal, full battery, `9:41`
- Realistic content — no "Test 1", no lorem
- `scripts/seed-screenshot-user.mjs` already exists in this repo for seeding demo data; use it to get frames 2–4 looking active

---

## 5 · Then run this

Once the four PNGs are in `screenshots/captures/`:

```bash
python scripts/aso/compose.py --bg '#B0496A' --verb 'PICK'  --desc 'FROM 18 SHIBA MOODS'  --screenshot screenshots/captures/01-moods.png    --output screenshots/final/01-pick.png
python scripts/aso/compose.py --bg '#B0496A' --verb 'TRACK' --desc 'YOUR MOOD IN SECONDS' --screenshot screenshots/captures/02-home.png     --output screenshots/final/02-track.png
python scripts/aso/compose.py --bg '#B0496A' --verb 'FIND'  --desc 'WHAT LIFTS YOUR MOOD' --screenshot screenshots/captures/03-insights.png --output screenshots/final/03-find.png
python scripts/aso/compose.py --bg '#B0496A' --verb 'KEEP'  --desc 'YOUR DIARY PRIVATE'   --screenshot screenshots/captures/04-history.png  --output screenshots/final/04-keep.png
```

Output is exact-dimension 1290 × 2796 PNGs, ready to upload. Smoke-tested — the composer runs on this machine and resolves Fredoka Bold automatically.

**Upload:** App Store Connect → iPhone 6.7" display slot (fills 4 of 10). Play Console → phone screenshots (fills 4 of 8; **use all 8 eventually** — Play weights a fuller gallery).

**Also delete the current app preview video.** It shows a UI that doesn't exist, in the old blue theme, with a mood row reading "Anxious" — a word your own compliance doc bans. No video beats a misleading one.

---

## 6 · About the polish step

The `aso-appstore-screenshots` skill has a second stage that sends each composed frame to Nano Banana Pro to add depth, a photorealistic device frame, and "breakout" panel effects. **That stage can't run here** — it needs the Gemini MCP server (`generate_image` / `edit_image`), which isn't installed. The skill's own instructions say not to proceed without it.

To enable it later:
```
npm install -g gemini-mcp
# add to ~/.claude/settings.json or project .mcp.json, then restart Claude Code
```

**You do not need it to ship.** The composed output is already a correct, clean, on-format App Store screenshot — flat brand colour, one typeface, unobstructed device, benefit headline. That alone clears the bar the current set fails on every count. Treat the enhancement pass as a later upgrade, not a prerequisite.

> Note: the skill's crop/resize step also assumes macOS (`sips`). It's not needed here — `compose.py` outputs exact App Store dimensions directly.

---

## 7 · Version the sources this time

`assets/store/` is empty and tracked — no source files for any store asset are kept. That is precisely how the live screenshots drifted a full theme redesign behind the app without anyone noticing.

`screenshots/final/` is committed; working versions are gitignored. Keep the raw captures too, so the next refresh starts from something.

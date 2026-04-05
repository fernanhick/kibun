# Enterprise Plan Audit Report

**Plan:** .paul/phases/07-on-device-insights/07-02-PLAN.md
**Audited:** 2026-04-05
**Verdict:** Conditionally Acceptable -> Ready (after applying findings)

---

## 1. Executive Verdict

**Conditionally Acceptable.** The plan is well-structured with clear pattern detection logic, appropriate thresholds, and correct reuse of existing utilities. Two must-have findings (division by zero in frequency denominators, incorrect entry ordering for trend detection) and one strongly-recommended finding (SLOT_LABELS type safety) required remediation. After applying all three, the plan is ready for APPLY.

I would approve this plan for production after the applied changes.

## 2. What Is Solid

- **Pure function design** — `patterns.ts` accepts entries as parameters, never imports stores. Consistent with established `insights.ts` and `notifications.ts` patterns. Correct for testability and separation of concerns.
- **Reasonable thresholds** — 1.5x frequency ratio + minimum 3 occurrences prevents false positives from sparse data. 0.5 score difference for trend is meaningful given the 1-4 scale (12.5% of range).
- **Minimum data guard** — `entries.length < 7` threshold prevents pattern noise from tiny datasets. Applied at the top-level `detectPatterns` function.
- **Result limiting** — Top 2 per detector type + 1 trend = max ~5 flags. Prevents UI clutter.
- **Boundaries are comprehensive** — All stable files (insights.ts, stores, constants, other screens) explicitly protected. No ML, no external AI, no subscription gating.
- **Accessibility covered** — accessibilityLabel on pattern cards, accessibilityRole="header" on section header.

## 3. Findings

### Must-Have (2) — Applied

**MH-1: Division by zero in frequency denominators**
- **Risk:** Both `detectDayOfWeekPatterns` and `detectTimeOfDayPatterns` compute per-day/per-slot frequency as `count(moodId on day) / count(all entries on day)`. If a day or slot has 0 total entries, this produces `Infinity`, which exceeds any threshold and falsely triggers a pattern flag.
- **Impact:** False pattern flags displayed to users (e.g., "You often feel Happy on Wednesdays" when no entries exist on Wednesday).
- **Fix applied:** Added guard step (c) to both detectors: "skip any day/slot where count(all entries on day/slot) === 0 to prevent division by zero."

**MH-2: Trend detection must sort entries before splitting**
- **Risk:** `moodEntryStore.addEntry` uses `[entry, ...state.entries]` — entries are reverse-chronological (newest first). The plan says "split entries chronologically into first half and second half" but doesn't specify sorting. Without an explicit ascending sort by `loggedAt`, the "first half" would actually be the most recent entries, inverting the trend direction.
- **Impact:** "Your mood has been improving" shown when it's actually declining, and vice versa.
- **Fix applied:** Added explicit instruction: "MUST sort entries by loggedAt ascending before splitting" with comment explaining store prepend behavior.

### Strongly Recommended (1) — Applied

**SR-1: SLOT_LABELS typed as Record<MoodSlot, string>**
- **Risk:** If `SLOT_LABELS` is typed as a plain object literal, adding a new `MoodSlot` value in the future won't produce a compile-time error — the new slot silently gets `undefined` from the lookup, resulting in pattern text like "You tend to feel Calm in undefined".
- **Impact:** Silent runtime bug when MoodSlot type evolves.
- **Fix applied:** Added `Record<MoodSlot, string>` type annotation to SLOT_LABELS constant.

### Can Safely Defer (1) — Not Applied

**D-1: Cross-platform emoji rendering consistency**
- **Context:** Pattern flags use emoji icons (📅, 🕐, 📈, 📉, 🌱). Emoji rendering varies across Android versions and OEM skins — some older devices may render these as empty boxes or different glyphs.
- **Why defer:** This is a cosmetic concern affecting a small subset of devices. The pattern text is the primary information carrier; the emoji is supplemental. Can be addressed in a UI polish pass by replacing emojis with icon components (e.g., @expo/vector-icons).
- **Resolution path:** Phase 9 (Polish & Launch Prep) or dedicated icon component refactor.

## 4. Architectural Assessment

The pattern detection approach is appropriate for MVP:
- Simple ratio comparison is computationally cheap (<50ms for typical datasets of 100-200 entries)
- No external dependencies required beyond existing MOOD_MAP and GROUP_SCORES
- Pure functions enable future unit testing without store mocking
- Results are recomputed per render via useMemo — no caching complexity, no stale state

The integration approach (adding a section below charts) is minimally invasive to the existing InsightsScreen. The conditional rendering logic (patterns.length > 0, filtered.length < 7) handles all edge cases.

## 5. Summary

| Category | Count | Status |
|----------|-------|--------|
| Must-Have | 2 | Applied to plan |
| Strongly Recommended | 1 | Applied to plan |
| Can Safely Defer | 1 | Documented for future |

**Verdict after remediation: Ready for APPLY.**

---
*Audit: 07-02, Phase: 07-on-device-insights*
*Audited: 2026-04-05*

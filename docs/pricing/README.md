# Kibun — international pricing review

Generated 2026-08-03. Live pulls, not estimates: Google Play Developer API
(`com.kibun.app`, 173 regions) and App Store Connect API (app `6761697507`, 175
territories). FX spot 2026-08-03, affordability from World Bank GNI per capita (PPP),
release 2026-07-13.

## Status: PARTIALLY APPLIED 2026-08-04

| Change | State |
| --- | --- |
| Play monthly 7-day free trial | **Live.** Offer `trial` created + activated on `monthly-pro`, free in all 173 regions. |
| Play band D+E price cuts | **Live.** 176 prices across 88 regions, verified 176/176. |
| Play annual normalization | **Live.** 11 band-A regions, yearly only, verified 11/11. |
| App Store band D+E price cuts | **Scheduled 2026-08-05.** 180 prices across 90 territories, verified 180/180. |
| App Store annual normalization | **Scheduled 2026-08-06.** 15 territories, yearly only, verified 15/15. |
| Paywall trial copy gating | **In code, needs a build/OTA to reach users.** |

Band A/B/C *monthly* prices were deliberately **not** touched on either store — those are
revenue trade-offs with no data behind them yet. The annual normalization does not move
any monthly price; it only aligns the yearly price to 5.84x monthly so the "save ~51%"
badge reads consistently everywhere. See [Before applying](#before-applying).

Existing subscribers were not migrated on Play. On iOS `preserveCurrentPrice: true` was
sent, but Apple only materialises a preserved row where the price goes *up*, so for cuts
this is unverified — moot today, since there are no subscribers.

The same method was applied to SneakersBook, where it is already live — see that repo's
`docs/pricing/README.md` for the longer write-up of the method and its caveats.

## Files

| File | What it is |
| --- | --- |
| `01-current-prices.csv` | Live Play grid, 173 regions, local + USD gross + USD net of tax. |
| `02-recommended-prices.csv` | Play change sheet: `action` = keep / cut / raise / normalize-annual. |
| `03-analysis.json` | Play analysis plus intermediate values. |
| `05-ios-current-prices.csv` | Live App Store schedule, 175 territories, with an `ios_vs_play_pct` column. |
| `06-ios-recommended-prices.csv` | App Store change sheet. |
| `07-ios-analysis.json` | iOS analysis plus intermediate values. |
| `data/` | Raw API snapshots. Regenerable; not worth committing. |

```bash
node scripts/pricing/fetch-data.js       # Play + FX + World Bank
node scripts/pricing/calibrate.js        # -> 01-03
node scripts/pricing/fetch-ios-data.js   # App Store schedule + price ladders
node scripts/pricing/calibrate-ios.js    # -> 05-07
```

Everything app-specific lives in `scripts/pricing/app-config.js`. The band ladder is in
`bands.js` and is shared by all four scripts, so the two stores cannot drift apart.

## What we sell today

Kibun's US anchors are **$5.99/month and $34.99/year**, and unusually, **both stores
already agree on them.** Play uses one product per period (`com.kibun.rc.monthly` /
`.yearly`, base plans `monthly-pro` / `yearly-pro`); iOS uses two subscriptions in the
`rc_pro` group.

The annual discount is **51.3%** (yearly = 5.84x monthly). That is much steeper than
typical — SneakersBook runs 41.7%. It has been **preserved, not normalized**: changing
it is a pricing-strategy decision, not a calibration one. If you want a shallower annual
discount, change `yearlyMultiple` in `app-config.js` and re-run.

## Findings

### 0. The Play monthly plan promised a trial it did not have — FIXED

`app/paywall.tsx` rendered "billed monthly after trial" and a "Subscribe · 7 days free"
CTA with no platform gating, but `monthly-pro` had **no offer at all** on Play. An Android
user who switched to Monthly was promised a trial and charged immediately.

The paywall defaults to `annual`, which *did* have a trial, so this was not the default
path — but it was a broken promise at the point of purchase and a store-policy risk.

Two fixes, both applied: a 7-day free trial offer now exists on `monthly-pro` in all 173
regions, and the paywall now derives its copy from whether the live package actually has a
free phase (`hasFreeTrial()`), falling back to no-trial strings in all four locales.

### 1. 77 of 173 Play regions were never localized

Google fell back to the raw USD price, so users in those regions pay the full US
$5.99/$34.99. The list includes Mozambique, Somalia, DR Congo, Liberia, Chad, Haiti,
Uganda and Yemen. Uganda is actually *worse* than the US at $7.07/month.

### 2. iOS has the identical problem

All 55 App Store territories in band E currently sit between **$5.32 and $6.76 net per
month, median exactly $5.99** — the US price, everywhere from Malawi to Afghanistan.

### 3. The two stores disagree in 74 of 130 comparable countries

Of the countries where both stores bill in the same currency, iOS is dearer in 57,
cheaper in 17, and within 1% in only 56.

| Country | iOS | Play | Gap |
| --- | --- | --- | --- |
| Colombia | $29,900 | $22,000 | +35.9% |
| Brazil | R$39.90 | R$30.99 | +28.8% |
| Vietnam | ₫199,000 | ₫158,000 | +25.9% |
| Peru | S/24.90 | S/20.99 | +18.6% |
| Qatar | ﷼19.99 | ﷼22 | -9.1% |
| South Korea | ₩8,800 | ₩9,900 | -11.1% |
| New Zealand | NZ$9.99 | NZ$11.99 | -16.7% |
| Egypt | E£299.99 | E£369.99 | -18.9% |

Note this is the *opposite* direction from SneakersBook in several places — nobody chose
either pattern; it is two auto-conversions drifting independently.

### 4. The annual discount is inconsistent

Meant to read as "save 51%". Today it ranges from **44.1% to 58.3% on iOS** and 49% to
56.6% on Play, because each store rounds each plan independently.

## The model

Five bands, assigned by GNI per capita (PPP) relative to the US, anchored on Kibun's own
$5.99 US price. Ratios match the ones used for SneakersBook so the two apps stay
comparable.

| Band | Index | Net monthly | Net yearly | Play | iOS |
| --- | --- | --- | --- | --- | --- |
| A — Parity | ≥ 0.70 | $5.99 | $34.99 | 34 | 34 |
| B — Near-parity | 0.45–0.70 | $4.79 | $27.98 | 26 | 23 |
| C — Mid | 0.28–0.45 | $3.59 | $20.97 | 25 | 28 |
| D — Emerging | 0.15–0.28 | $2.40 | $14.02 | 29 | 35 |
| E — Low-income | < 0.15 | $1.80 | $10.51 | 59 | 55 |

"Net" is net of local VAT/GST and before the store's cut — the only basis on which a
German price and a US price are comparable. Play tax rates come from Google's own
`convertRegionPrices`; Apple reports `proceeds` per territory directly.

Yearly is pinned at 5.84x monthly everywhere, which tightens the annual saving to
50.3–52.2% on Play and 50.7–52.2% on iOS.

Proposed changes:

| | Cut | Normalize annual | Raise | Keep |
| --- | --- | --- | --- | --- |
| **Play** (173) | 140 | 11 | 0 | 22 |
| **iOS** (175) | 151 | 15 | 2 | 7 |

Unweighted mean net monthly would fall from $5.98 to $3.42 on Play and $6.09 to $3.42 on
iOS. That average treats Chad and Germany equally, so it overstates revenue impact — but
the risk it points at is real for the larger markets.

## Before applying

**Do not ship all of this at once.** Recommended order, both stores together:

1. **Band E** (59 Play regions, 55 iOS territories). Near-zero downside — current revenue
   there is almost certainly negligible.
2. **The annual normalization** (11 Play, 15 iOS). Monthly prices do not move.
3. **Close the cross-store gap** in Brazil, Colombia, Vietnam, Peru, Korea, Egypt, NZ.
4. **Bands B–D in markets with real volume.** Validate against actual per-country revenue
   in RevenueCat first. These are genuine revenue trade-offs, modelled on affordability
   alone.

## Open items

- **The Kibun Play service account cannot call the pricing endpoints.**
  `kibun-play-store-api@api-project-146169649450` reads subscriptions fine but returns
  `403 PERMISSION_DENIED` on `pricing:convertRegionPrices`. This run used the SneakersBook
  service account, which has broader Play Console access, via the
  `GOOGLE_PLAY_SERVICE_ACCOUNT` env override. **Grant the Kibun account the same
  permissions in Play Console → Users and permissions** so this repo is self-sufficient.
- **Bands B and C are still unapplied** on both stores, by design. Revisit once there is
  real conversion data — see [Before applying](#before-applying).

### Gotchas worth keeping

- Play requires a current `regionsVersion` (**2025/03**); it names the right one in the
  error if this goes stale.
- Apple rejects immediate changes on an approved subscription, and rejects a start date
  that is not strictly in the future. `apply-ios-prices.js` derives "tomorrow" from local
  time for this reason — deriving it from a UTC ISO string can resolve to today.
- **Offer phases must move in the right order relative to the base plan.** The yearly
  `trial` offer discounts the first year, and Google rejects any state where a phase price
  exceeds the base price pro rata. So phases are lowered *before* a price cut and raised
  *after* a price rise; `apply-play-prices.js` does both passes around the base PATCH.
- Apple applies price *decreases* on the scheduled date but holds *increases* pending,
  since those need existing-subscriber notice.

#!/usr/bin/env node
/**
 * Kibun — Google Play price normalization + PPP calibration.
 *
 *  1. NORMALIZE. Convert every live price to USD, then strip the VAT/GST baked
 *     into the listed price (Google reports the tax component per region; the US
 *     price carries none). The result is "net USD" — what reaches us before
 *     Google's cut, and the only apples-to-apples comparison across countries.
 *  2. CALIBRATE. Score affordability as GNI per capita (PPP) relative to the US
 *     and assign a band (bands.js). Yearly is pinned to a fixed multiple of
 *     monthly so the annual-saving badge reads the same everywhere.
 *  3. LOCALIZE. Read the local price for the band anchor straight out of Google's
 *     own converter, so every recommendation is a real, idiomatic price point.
 *
 * Run `node scripts/pricing/fetch-data.js` first.
 * Usage: node scripts/pricing/calibrate.js
 */
const fs = require("fs");
const path = require("path");

const config = require("./app-config.js");
const { BANDS, YEARLY_MULTIPLE, anchorsFor, bandFor } = require("./bands.js");
const { GNI_FALLBACK } = require("./gni-fallback.js");

const DIR = config.dataDir;
const OUT = config.outDir;

const grid = JSON.parse(fs.readFileSync(`${DIR}/play-grid.json`, "utf8"));
const fxDoc = JSON.parse(fs.readFileSync(`${DIR}/fx-usd.json`, "utf8"));
const gniRows = JSON.parse(fs.readFileSync(`${DIR}/wb-gni-ppp.json`, "utf8"));
const iso2 = JSON.parse(fs.readFileSync(`${DIR}/iso2-map.json`, "utf8"));
const conversions = JSON.parse(fs.readFileSync(`${DIR}/price-conversions.json`, "utf8"));

const FX = fxDoc.rates;
const GNI = Object.fromEntries(gniRows.map((r) => [r.iso3, r]));
const US_GNI = GNI.USA.gniPpp;
const PLANS = config.plans;
const DRIFT_TOLERANCE = 0.08;

const round = (n, d = 2) =>
  n == null || !isFinite(n) ? null : Math.round(n * 10 ** d) / 10 ** d;
const amountOf = (p) => Number(p.units || 0) + Number(p.nanos || 0) / 1e9;

// ---- Tax rates, straight from Google -----------------------------------
// taxAmount / price is the statutory digital-services rate Google applies in that
// region. Authoritative, and it removes any need for a hand-maintained VAT table.
const TAX_RATE = {};
{
  const biggest = Object.keys(conversions).sort((a, b) => Number(b) - Number(a))[0];
  for (const [region, v] of Object.entries(conversions[biggest])) {
    const price = amountOf(v.price);
    const tax = v.taxAmount ? amountOf(v.taxAmount) : 0;
    TAX_RATE[region] = price > 0 ? round(tax / price, 4) : 0;
  }
}

function convertedPrice(usd, region) {
  const entry = conversions[usd.toFixed(2)]?.[region];
  return entry ? amountOf(entry.price) : null;
}

// Which currencies are used with decimals here (JPY/KRW/IDR are not).
const decimalCcy = {};
for (const plan of PLANS) {
  for (const r of Object.values(grid[plan].regions)) {
    decimalCcy[r.currency] =
      decimalCcy[r.currency] || Math.abs(r.amount - Math.round(r.amount)) > 1e-9;
  }
}

/**
 * Derive the yearly price from the monthly anchor. Google's converter rounds each
 * amount independently, which lets the yearly/monthly ratio drift and makes the
 * "save X%" badge say something different in every country. A proportional step
 * (~5% of the order of magnitude) keeps the ratio within ~1% while still landing
 * on a clean, charm-ended number.
 */
function derivePrice(monthlyLocal, multiple, currency) {
  const raw = monthlyLocal * multiple;
  if (!isFinite(raw) || raw <= 0) return null;
  const decimal = !!decimalCcy[currency];
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = decimal ? mag / 20 : Math.max(mag / 20, 1);
  const base = Math.round(raw / step) * step;
  if (decimal) {
    const v = Math.round((base - 0.01) * 100) / 100;
    return v > 0 ? v : Math.round(base * 100) / 100;
  }
  const v = Math.round(base);
  return v >= 100 ? v - 1 : v;
}

// ---- Per-region calibration -------------------------------------------
const US_NET = config.usAnchor;
const results = [];

for (const region of Object.keys(grid.monthly.regions).sort()) {
  const meta = iso2[region] || {};
  const gniVal = (meta.iso3 && GNI[meta.iso3]?.gniPpp) || GNI_FALLBACK[region] || null;
  const gniSource =
    meta.iso3 && GNI[meta.iso3]?.gniPpp
      ? `WorldBank ${GNI[meta.iso3].year}`
      : GNI_FALLBACK[region]
        ? "estimate"
        : "none";
  const index = gniVal ? gniVal / US_GNI : 1;
  const band = bandFor(index);
  const anchors = anchorsFor(band);
  const taxRate = TAX_RATE[region] ?? 0;
  const grossToNet = (g) => (g == null ? null : g / (1 + taxRate));

  const mCur = grid.monthly.regions[region];
  const rate = FX[mCur.currency];
  const mNetNow = grossToNet(rate ? mCur.amount / rate : null);
  const mTarget = convertedPrice(anchors.monthly, region);
  const mTargetNet = grossToNet(mTarget != null && rate ? mTarget / rate : null);
  const monthlyGapPct = mNetNow != null && mTargetNet ? (mNetNow / mTargetNet - 1) * 100 : 0;
  const monthlyStays = Math.abs(monthlyGapPct) <= DRIFT_TOLERANCE * 100;
  const finalMonthly = monthlyStays ? mCur.amount : (mTarget ?? mCur.amount);

  const row = {
    region,
    country: meta.name || region,
    wbRegion: meta.region || "",
    incomeGroup: meta.income || "",
    gniPpp: gniVal,
    gniSource,
    incomeIndex: round(index, 3),
    band: band.id,
    bandLabel: band.label,
    taxRate,
    usdFallback: mCur.currency === "USD" && region !== "US",
    plans: {},
  };

  for (const plan of PLANS) {
    const cur = grid[plan].regions[region];
    if (!cur) continue;
    const grossUsd = rate ? cur.amount / rate : null;
    const netUsd = grossToNet(grossUsd);
    const newLocal =
      plan === "monthly"
        ? finalMonthly
        : (derivePrice(finalMonthly, YEARLY_MULTIPLE, cur.currency) ?? cur.amount);
    const newNetUsd = grossToNet(rate ? newLocal / rate : null);

    row.plans[plan] = {
      currency: cur.currency,
      current: cur.amount,
      currentGrossUsd: round(grossUsd),
      currentNetUsd: round(netUsd),
      netVsUsPct: netUsd != null ? round((netUsd / US_NET[plan] - 1) * 100, 1) : null,
      targetNetUsd: anchors[plan],
      recommended: newLocal,
      recommendedNetUsd: round(newNetUsd),
      changePct:
        newLocal != null && cur.amount > 0 ? round((newLocal / cur.amount - 1) * 100, 1) : null,
    };
  }

  const m = row.plans.monthly;
  const y = row.plans.yearly;
  if (m && y && m.current > 0) {
    row.savingsPctCurrent = round((1 - y.current / (m.current * 12)) * 100, 1);
    row.savingsPctNew = round((1 - y.recommended / (m.recommended * 12)) * 100, 1);
    row.yearlyMultipleCurrent = round(y.current / m.current, 2);
  }

  const yearlyMoves = y && Math.abs(y.changePct ?? 0) > 2;
  if (!monthlyStays) row.action = monthlyGapPct >= 0 ? "cut" : "raise";
  else if (yearlyMoves) row.action = "normalize-annual";
  else {
    row.action = "keep";
    for (const p of Object.values(row.plans)) {
      p.recommended = p.current;
      p.changePct = 0;
    }
    row.savingsPctNew = row.savingsPctCurrent;
  }
  row.monthlyGapPct = round(monthlyGapPct, 1);
  results.push(row);
}

// ---- Outputs -----------------------------------------------------------
fs.mkdirSync(OUT, { recursive: true });
const csv = (s) => {
  if (s == null) return "";
  const v = String(s);
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
};
const writeCsv = (file, header, rows) =>
  fs.writeFileSync(path.join(OUT, file), [header.join(","), ...rows].join("\n") + "\n");

writeCsv(
  "01-current-prices.csv",
  ["region","country","world_bank_region","income_group","currency","usd_fallback",
   "monthly_local","yearly_local","monthly_gross_usd","monthly_net_usd","yearly_net_usd",
   "monthly_net_vs_us_pct","yearly_over_monthly","annual_savings_pct","tax_rate",
   "gni_per_capita_ppp","gni_source","income_index_vs_us","band"],
  results.map((r) =>
    [r.region, csv(r.country), csv(r.wbRegion), csv(r.incomeGroup),
     r.plans.monthly.currency, r.usdFallback ? "YES" : "",
     r.plans.monthly.current, r.plans.yearly.current,
     r.plans.monthly.currentGrossUsd, r.plans.monthly.currentNetUsd, r.plans.yearly.currentNetUsd,
     r.plans.monthly.netVsUsPct, r.yearlyMultipleCurrent ?? "", r.savingsPctCurrent ?? "",
     r.taxRate, r.gniPpp != null ? Math.round(r.gniPpp) : "", csv(r.gniSource),
     r.incomeIndex, r.band].join(","),
  ),
);

writeCsv(
  "02-recommended-prices.csv",
  ["region","country","band","band_label","income_index","currency","action",
   "monthly_current","monthly_recommended","monthly_change_pct",
   "yearly_current","yearly_recommended","yearly_change_pct",
   "monthly_net_usd_now","monthly_net_usd_new",
   "annual_savings_now_pct","annual_savings_new_pct","tax_rate"],
  results.map((r) =>
    [r.region, csv(r.country), r.band, csv(r.bandLabel), r.incomeIndex,
     r.plans.monthly.currency, r.action,
     r.plans.monthly.current, r.plans.monthly.recommended, r.plans.monthly.changePct,
     r.plans.yearly.current, r.plans.yearly.recommended, r.plans.yearly.changePct,
     r.plans.monthly.currentNetUsd, r.plans.monthly.recommendedNetUsd,
     r.savingsPctCurrent ?? "", r.savingsPctNew ?? "", r.taxRate].join(","),
  ),
);

fs.writeFileSync(
  path.join(OUT, "03-analysis.json"),
  JSON.stringify(
    {
      app: config.name,
      generatedAt: new Date().toISOString(),
      fxAsOf: fxDoc.time_last_update_utc,
      source: `Google Play Developer API, ${config.play.packageName}`,
      model: { BANDS, YEARLY_MULTIPLE, DRIFT_TOLERANCE, usGniPpp: US_GNI, usAnchor: US_NET },
      results,
    },
    null,
    2,
  ),
);

// ---- Console report ----------------------------------------------------
const pad = (s, n) => {
  s = String(s ?? "");
  return s.length >= n ? s.slice(0, n) : s + " ".repeat(n - s.length);
};
const byAction = {};
results.forEach((r) => (byAction[r.action] = (byAction[r.action] || 0) + 1));
console.log(`${config.name} — Google Play`);
console.log(`regions: ${results.length}   FX as of: ${fxDoc.time_last_update_utc}`);
console.log("actions:", JSON.stringify(byAction));

console.log("\n=== BANDS ===");
for (const b of BANDS) {
  const a = anchorsFor(b);
  console.log(
    `  ${b.id} ${pad(b.label, 12)} net $${a.monthly}/mo  $${a.yearly}/yr   ` +
      `${results.filter((r) => r.band === b.id).length} regions`,
  );
}

console.log(`\n=== USD-FALLBACK REGIONS (never localized, paying the full US price) ===`);
const fb = results.filter((r) => r.usdFallback).sort((a, b) => a.incomeIndex - b.incomeIndex);
console.log(`  ${fb.length} regions; poorest 12:`);
fb.slice(0, 12).forEach((r) =>
  console.log(
    `  ${r.region} ${pad(r.country, 24)} idx ${pad(r.incomeIndex, 6)} [${r.band}]  ` +
      `$${r.plans.monthly.current} -> $${r.plans.monthly.recommended}/mo   ` +
      `$${r.plans.yearly.current} -> $${r.plans.yearly.recommended}/yr`,
  ),
);

console.log("\n=== TOP MARKETS ===");
const KEY = ["US","GB","DE","FR","CA","AU","JP","IT","ES","NL","SE","PL","KR","TR","BR","MX","AR","IN","ID","PH","TH","ZA","NG","SA","AE","CH"];
console.log(`  ${pad("cc",4)}${pad("country",17)}${pad("bd",4)}${pad("monthly now",15)}${pad("-> new",14)}${pad("net$now",9)}${pad("net$new",9)}action`);
for (const cc of KEY) {
  const r = results.find((x) => x.region === cc);
  if (!r) continue;
  const m = r.plans.monthly;
  console.log(
    `  ${pad(r.region,4)}${pad(r.country,17)}${pad(r.band,4)}${pad(m.current+" "+m.currency,15)}` +
      `${pad(m.recommended+" "+m.currency,14)}${pad("$"+m.currentNetUsd,9)}${pad("$"+m.recommendedNetUsd,9)}${r.action}`,
  );
}

const sNow = results.map((r) => r.savingsPctCurrent).filter((v) => v != null).sort((a,b)=>a-b);
const sNew = results.map((r) => r.savingsPctNew).filter((v) => v != null).sort((a,b)=>a-b);
console.log(`\n=== ANNUAL SAVINGS % (US baseline ${round((1 - US_NET.yearly/(US_NET.monthly*12))*100,1)}%) ===`);
console.log(`  today: ${sNow[0]}% .. ${sNow[sNow.length-1]}%`);
console.log(`  after: ${sNew[0]}% .. ${sNew[sNew.length-1]}%`);

const mean = (f) => results.reduce((s, r) => s + (f(r) || 0), 0) / results.length;
console.log(
  `\nUnweighted mean net monthly: $${round(mean((r) => r.plans.monthly.currentNetUsd))} -> ` +
    `$${round(mean((r) => r.plans.monthly.recommendedNetUsd))}`,
);
console.log(`\nWrote 01/02/03 to ${OUT}`);

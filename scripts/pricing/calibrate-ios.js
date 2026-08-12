#!/usr/bin/env node
/**
 * Kibun — App Store side of the price review. Same bands as Play (bands.js), so
 * the two stores land on one coherent global ladder.
 *
 * Apple reports `proceeds` per territory directly — revenue after local tax AND
 * commission — so net of tax (the same basis as the Play sheets) is
 * proceeds / commission. Verified against the USA row, where proceeds/price
 * equals the Small Business Program rate exactly.
 *
 * Targets are matched on NET revenue, not on Apple's "equalization". Apple
 * equalizes the US *customer* price including local VAT, which would put iOS well
 * above the band anchor in high-tax territories and bake in a cross-store gap.
 *
 * Run `node scripts/pricing/fetch-ios-data.js` first.
 * Usage: node scripts/pricing/calibrate-ios.js
 */
const fs = require("fs");
const path = require("path");

const config = require("./app-config.js");
const { BANDS, YEARLY_MULTIPLE, anchorsFor, bandFor } = require("./bands.js");
const { GNI_FALLBACK } = require("./gni-fallback.js");

const DIR = config.dataDir;
const OUT = config.outDir;

const asc = JSON.parse(fs.readFileSync(`${DIR}/asc-prices.json`, "utf8"));
const fxDoc = JSON.parse(fs.readFileSync(`${DIR}/fx-usd.json`, "utf8"));
const gniRows = JSON.parse(fs.readFileSync(`${DIR}/wb-gni-ppp.json`, "utf8"));
const iso2map = JSON.parse(fs.readFileSync(`${DIR}/iso2-map.json`, "utf8"));
const playGrid = JSON.parse(fs.readFileSync(`${DIR}/play-grid.json`, "utf8"));

const FX = fxDoc.rates;
const GNI = Object.fromEntries(gniRows.map((r) => [r.iso3, r]));
const US_GNI = GNI.USA.gniPpp;
const COMMISSION = config.asc.commission;
const DRIFT_TOLERANCE = 0.08;
const PLANS = config.plans;
const US_NET = config.usAnchor;

const round = (n, d = 2) =>
  n == null || !isFinite(n) ? null : Math.round(n * 10 ** d) / 10 ** d;

// ISO3 (Apple) -> ISO2 (World Bank / Play), plus the territories the World Bank
// does not list.
const iso3to2 = {};
for (const [two, m] of Object.entries(iso2map)) iso3to2[m.iso3] = two;
Object.assign(iso3to2, {
  TWN: "TW", ANT: "AN", AIA: "AI", ATG: "AG", BMU: "BM", VGB: "VG", CYM: "KY",
  COK: "CK", DMA: "DM", GRD: "GD", MSR: "MS", NIU: "NU", TCA: "TC", WLF: "WF",
  SPM: "PM", VAT: "VA", ESH: "EH", FLK: "FK", GLP: "GP", GUF: "GF", MTQ: "MQ",
  MYT: "YT", REU: "RE", SHN: "SH", VCT: "VC", KNA: "KN", LCA: "LC", BRB: "BB",
  BHS: "BS", BLZ: "BZ", GUY: "GY", SUR: "SR", MDV: "MV", BTN: "BT", BRN: "BN",
  TLS: "TL", NRU: "NR", PLW: "PW", MHL: "MH", KIR: "KI", TUV: "TV", NCL: "NC",
  PYF: "PF", ATF: "TF", UMI: "UM",
});

const playMonthly = playGrid.monthly.regions;

function nearestByPrice(ladder, target) {
  let best = null, bestD = Infinity;
  for (const p of ladder || []) {
    if (p.customerPrice == null) continue;
    const d = Math.abs(p.customerPrice - target);
    if (d < bestD) { bestD = d; best = p; }
  }
  return best;
}

function nearestByNetUsd(ladder, targetNetUsd, fx) {
  if (!fx) return null;
  let best = null, bestD = Infinity;
  for (const p of ladder || []) {
    if (p.proceeds == null) continue;
    const d = Math.abs(p.proceeds / COMMISSION / fx - targetNetUsd);
    if (d < bestD) { bestD = d; best = p; }
  }
  return best;
}

const results = [];
const unmapped = [];

for (const terr of Object.keys(asc.current.monthly).sort()) {
  const cc = iso3to2[terr];
  if (!cc) unmapped.push(terr);
  const meta = (cc && iso2map[cc]) || {};
  const gniVal = (GNI[terr] && GNI[terr].gniPpp) || (cc && GNI_FALLBACK[cc]) || null;
  const gniSource = GNI[terr]?.gniPpp ? `WorldBank ${GNI[terr].year}` : gniVal ? "estimate" : "none";
  const index = gniVal ? gniVal / US_GNI : 1;
  const band = bandFor(index);
  const anchors = anchorsFor(band);
  const currency = asc.territoryCurrency[terr];
  const fx = FX[currency];
  const ladder = asc.ladders[terr] || [];

  const netLocal = (proceeds) => (proceeds == null ? null : proceeds / COMMISSION);
  const toUsd = (v) => (v == null || !fx ? null : v / fx);

  const mCur = asc.current.monthly[terr];
  const mNetUsdNow = toUsd(netLocal(mCur.proceeds));
  const mRec = nearestByNetUsd(ladder, anchors.monthly, fx);
  const mNetUsdNew = mRec ? toUsd(netLocal(mRec.proceeds)) : null;
  const monthlyGapPct =
    mNetUsdNow != null && mNetUsdNew ? (mNetUsdNow / mNetUsdNew - 1) * 100 : 0;
  const monthlyStays = Math.abs(monthlyGapPct) <= DRIFT_TOLERANCE * 100;
  const finalMonthly = monthlyStays ? mCur.customerPrice : (mRec?.customerPrice ?? mCur.customerPrice);

  const row = {
    territory: terr,
    region: cc || "",
    country: meta.name || terr,
    incomeGroup: meta.income || "",
    gniPpp: gniVal,
    gniSource,
    incomeIndex: round(index, 3),
    band: band.id,
    bandLabel: band.label,
    currency,
    plans: {},
  };

  for (const plan of PLANS) {
    const cur = asc.current[plan][terr];
    if (!cur) continue;
    const rec =
      plan === "monthly"
        ? mRec
        : nearestByPrice(ladder, finalMonthly * YEARLY_MULTIPLE);
    const useCurrent = monthlyStays && plan !== "yearly";
    const newPrice = useCurrent ? cur.customerPrice : (rec?.customerPrice ?? cur.customerPrice);
    const newProceeds = useCurrent ? cur.proceeds : (rec?.proceeds ?? cur.proceeds);

    row.plans[plan] = {
      currency,
      current: cur.customerPrice,
      currentProceeds: cur.proceeds,
      currentNetUsd: round(toUsd(netLocal(cur.proceeds))),
      netVsUsPct: round((toUsd(netLocal(cur.proceeds)) / US_NET[plan] - 1) * 100, 1),
      recommended: newPrice,
      recommendedProceeds: newProceeds,
      recommendedNetUsd: round(toUsd(netLocal(newProceeds))),
      changePct: cur.customerPrice > 0 ? round((newPrice / cur.customerPrice - 1) * 100, 1) : null,
      scheduledChange: cur.startDate || null,
    };
  }

  const m = row.plans.monthly, y = row.plans.yearly;
  if (m && y && m.current > 0) {
    row.savingsPctCurrent = round((1 - y.current / (m.current * 12)) * 100, 1);
    row.savingsPctNew = round((1 - y.recommended / (m.recommended * 12)) * 100, 1);
    row.yearlyMultipleCurrent = round(y.current / m.current, 2);
  }

  const play = cc && playMonthly[cc];
  if (play && play.currency === currency && play.amount > 0) {
    row.playMonthly = play.amount;
    row.iosVsPlayPct = round((m.current / play.amount - 1) * 100, 1);
  }

  const yearlyMoves = y && Math.abs(y.changePct ?? 0) > 2;
  if (!monthlyStays) row.action = monthlyGapPct >= 0 ? "cut" : "raise";
  else if (yearlyMoves) row.action = "normalize-annual";
  else {
    row.action = "keep";
    for (const p of Object.values(row.plans)) {
      p.recommended = p.current;
      p.recommendedProceeds = p.currentProceeds;
      p.recommendedNetUsd = p.currentNetUsd;
      p.changePct = 0;
    }
    row.savingsPctNew = row.savingsPctCurrent;
  }
  row.monthlyGapPct = round(monthlyGapPct, 1);
  results.push(row);
}

// ---- outputs -----------------------------------------------------------
fs.mkdirSync(OUT, { recursive: true });
const csv = (s) => {
  if (s == null) return "";
  const v = String(s);
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
};
const writeCsv = (file, header, rows) =>
  fs.writeFileSync(path.join(OUT, file), [header.join(","), ...rows].join("\n") + "\n");

writeCsv(
  "05-ios-current-prices.csv",
  ["territory","region","country","income_group","currency","monthly_local","yearly_local",
   "monthly_proceeds","yearly_proceeds","monthly_net_usd","yearly_net_usd",
   "monthly_net_vs_us_pct","yearly_over_monthly","annual_savings_pct",
   "play_monthly_local","ios_vs_play_pct","gni_per_capita_ppp","gni_source",
   "income_index_vs_us","band","scheduled_change"],
  results.map((r) =>
    [r.territory, r.region, csv(r.country), csv(r.incomeGroup), r.currency,
     r.plans.monthly.current, r.plans.yearly.current,
     r.plans.monthly.currentProceeds, r.plans.yearly.currentProceeds,
     r.plans.monthly.currentNetUsd, r.plans.yearly.currentNetUsd,
     r.plans.monthly.netVsUsPct, r.yearlyMultipleCurrent ?? "", r.savingsPctCurrent ?? "",
     r.playMonthly ?? "", r.iosVsPlayPct ?? "",
     r.gniPpp != null ? Math.round(r.gniPpp) : "", csv(r.gniSource),
     r.incomeIndex, r.band, r.plans.monthly.scheduledChange ?? ""].join(","),
  ),
);

writeCsv(
  "06-ios-recommended-prices.csv",
  ["territory","region","country","band","band_label","income_index","currency","action",
   "monthly_current","monthly_recommended","monthly_change_pct",
   "yearly_current","yearly_recommended","yearly_change_pct",
   "monthly_net_usd_now","monthly_net_usd_new",
   "annual_savings_now_pct","annual_savings_new_pct"],
  results.map((r) =>
    [r.territory, r.region, csv(r.country), r.band, csv(r.bandLabel), r.incomeIndex,
     r.currency, r.action,
     r.plans.monthly.current, r.plans.monthly.recommended, r.plans.monthly.changePct,
     r.plans.yearly.current, r.plans.yearly.recommended, r.plans.yearly.changePct,
     r.plans.monthly.currentNetUsd, r.plans.monthly.recommendedNetUsd,
     r.savingsPctCurrent ?? "", r.savingsPctNew ?? ""].join(","),
  ),
);

fs.writeFileSync(
  path.join(OUT, "07-ios-analysis.json"),
  JSON.stringify(
    {
      app: config.name,
      generatedAt: new Date().toISOString(),
      fxAsOf: fxDoc.time_last_update_utc,
      source: `App Store Connect API, app ${config.asc.appId}`,
      model: { BANDS, YEARLY_MULTIPLE, DRIFT_TOLERANCE, COMMISSION, usGniPpp: US_GNI, usAnchor: US_NET },
      unmappedTerritories: unmapped,
      results,
    },
    null,
    2,
  ),
);

// ---- console report ----------------------------------------------------
const pad = (s, n) => {
  s = String(s ?? "");
  return s.length >= n ? s.slice(0, n) : s + " ".repeat(n - s.length);
};
const byAction = {};
results.forEach((r) => (byAction[r.action] = (byAction[r.action] || 0) + 1));
console.log(`${config.name} — App Store`);
console.log(`territories: ${results.length}`);
console.log("actions:", JSON.stringify(byAction));
if (unmapped.length) console.log("unmapped:", unmapped.join(" "));

console.log("\n=== iOS vs PLAY, same country and currency ===");
const cmp = results.filter((r) => r.iosVsPlayPct != null).sort((a, b) => b.iosVsPlayPct - a.iosVsPlayPct);
const hi = cmp.filter((r) => r.iosVsPlayPct > 1).length;
const lo = cmp.filter((r) => r.iosVsPlayPct < -1).length;
console.log(`  comparable ${cmp.length}: iOS dearer ${hi}, cheaper ${lo}, within 1% ${cmp.length - hi - lo}`);
cmp.slice(0, 6).forEach((r) =>
  console.log(`    ${pad(r.country,22)} iOS ${pad(r.plans.monthly.current+" "+r.currency,14)} vs Play ${pad(r.playMonthly+" "+r.currency,14)} +${r.iosVsPlayPct}%`));
cmp.slice(-4).reverse().forEach((r) =>
  console.log(`    ${pad(r.country,22)} iOS ${pad(r.plans.monthly.current+" "+r.currency,14)} vs Play ${pad(r.playMonthly+" "+r.currency,14)} ${r.iosVsPlayPct}%`));

console.log("\n=== TOP MARKETS ===");
const KEY = ["USA","GBR","DEU","FRA","CAN","AUS","JPN","ITA","ESP","NLD","SWE","POL","KOR","TUR","BRA","MEX","ARG","IND","IDN","PHL","THA","ZAF","NGA","SAU","ARE","CHE"];
console.log(`  ${pad("terr",6)}${pad("country",17)}${pad("bd",4)}${pad("monthly now",15)}${pad("-> new",14)}${pad("net$now",9)}${pad("net$new",9)}action`);
for (const t of KEY) {
  const r = results.find((x) => x.territory === t);
  if (!r) continue;
  const m = r.plans.monthly;
  console.log(`  ${pad(r.territory,6)}${pad(r.country,17)}${pad(r.band,4)}${pad(m.current+" "+r.currency,15)}${pad(m.recommended+" "+r.currency,14)}${pad("$"+m.currentNetUsd,9)}${pad("$"+m.recommendedNetUsd,9)}${r.action}`);
}

const sNow = results.map((r) => r.savingsPctCurrent).filter((v) => v != null).sort((a,b)=>a-b);
const sNew = results.map((r) => r.savingsPctNew).filter((v) => v != null).sort((a,b)=>a-b);
console.log(`\n=== ANNUAL SAVINGS % (US baseline ${round((1 - US_NET.yearly/(US_NET.monthly*12))*100,1)}%) ===`);
console.log(`  today: ${sNow[0]}% .. ${sNow[sNow.length-1]}%`);
console.log(`  after: ${sNew[0]}% .. ${sNew[sNew.length-1]}%`);

const mean = (f) => results.reduce((s, r) => s + (f(r) || 0), 0) / results.length;
console.log(`\nUnweighted mean net monthly: $${round(mean((r)=>r.plans.monthly.currentNetUsd))} -> $${round(mean((r)=>r.plans.monthly.recommendedNetUsd))}`);
console.log(`\nWrote 05/06/07 to ${OUT}`);

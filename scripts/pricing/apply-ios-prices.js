#!/usr/bin/env node
/**
 * Write recommended App Store prices from docs/pricing/07-ios-analysis.json.
 *
 * SAFETY
 *  - Dry run by default. Nothing is written without --apply.
 *  - preserveCurrentPrice: true, so existing subscribers stay on the price they
 *    signed up at. (Apple only materialises a "preserved" row where the price
 *    goes UP, so for cuts verify in App Store Connect if this matters.)
 *  - Every price must exist on that territory's real ladder; anything unmatched
 *    is skipped and reported rather than approximated.
 *
 * Apple rejects an immediate change on an approved subscription
 * ("Initial price cannot be created again after subscription is approved"), so
 * every change is SCHEDULED. Earliest start date is tomorrow. A scheduled price
 * can be deleted before it takes effect — that is the rollback.
 *
 * Unlike Play this is one POST per territory per plan, so it is not atomic.
 *
 * Usage:
 *   node scripts/pricing/apply-ios-prices.js --bands=D,E
 *   node scripts/pricing/apply-ios-prices.js --bands=D,E --apply
 */
const fs = require("fs");
const path = require("path");
const { getAll, post } = require("./asc-client.js");
const config = require("./app-config.js");

const args = process.argv.slice(2);
const APPLY = args.includes("--apply");
const argVal = (n) => {
  const a = args.find((x) => x.startsWith(`--${n}=`));
  return a ? a.split("=")[1] : null;
};
const ONLY = argVal("only") ? argVal("only").split(",").map((s) => s.trim().toUpperCase()) : null;
const BANDS = argVal("bands") ? argVal("bands").split(",").map((s) => s.trim().toUpperCase()) : null;
// Target specific action types (keep / cut / raise / normalize-annual).
const ACTIONS = argVal("actions") ? argVal("actions").split(",").map((s) => s.trim()) : null;
/**
 * Tomorrow in LOCAL time. Deriving this from a UTC ISO string is wrong west of
 * UTC and in the small hours east of it: it can resolve to today, and Apple
 * rejects a start date that is not in the future.
 */
function tomorrowLocal() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
const START_DATE = argVal("start-date") || tomorrowLocal();

const asc = JSON.parse(fs.readFileSync(path.join(config.dataDir, "asc-prices.json"), "utf8"));
const analysis = JSON.parse(fs.readFileSync(path.join(config.outDir, "07-ios-analysis.json"), "utf8"));

/**
 * Price point IDs are base64 of {s: subscriptionId, t: territory, p: index}. The
 * ladder is identical across an app's subscriptions, so a point fetched from one
 * subscription is retargeted to another by swapping `s`.
 */
function pricePointIdFor(ladderId, subscriptionId) {
  const d = JSON.parse(Buffer.from(ladderId, "base64").toString("utf8"));
  return Buffer.from(JSON.stringify({ s: subscriptionId, t: d.t, p: d.p }))
    .toString("base64")
    .replace(/=+$/, "");
}

const eq = (a, b) => Math.abs(a - b) < 0.005;

(async () => {
  const planned = [];
  const unmatched = [];

  for (const row of analysis.results) {
    if (row.action === "keep") continue;
    if (ONLY && !ONLY.includes(row.territory)) continue;
    if (BANDS && !BANDS.includes(row.band)) continue;
    if (ACTIONS && !ACTIONS.includes(row.action)) continue;
    const ladder = asc.ladders[row.territory] || [];
    for (const plan of config.plans) {
      const p = row.plans[plan];
      if (!p || p.recommended == null || eq(p.recommended, p.current)) continue;
      const rung = ladder.find((x) => eq(x.customerPrice, p.recommended));
      if (!rung) {
        unmatched.push(`${row.territory}/${plan}: ${p.recommended} ${row.currency} not on ladder`);
        continue;
      }
      planned.push({
        territory: row.territory,
        country: row.country,
        band: row.band,
        currency: row.currency,
        plan,
        subscriptionId: asc.plans[plan].id,
        pricePointId: pricePointIdFor(rung.id, asc.plans[plan].id),
        from: p.current,
        to: p.recommended,
      });
    }
  }

  const territories = new Set(planned.map((p) => p.territory));
  console.log(
    `${APPLY ? "APPLY" : "DRY RUN"} — ${planned.length} price changes across ${territories.size} ` +
      `territories, effective ${START_DATE}${BANDS ? ` (bands ${BANDS.join(",")})` : ""}` +
      `${ACTIONS ? ` (actions ${ACTIONS.join(",")})` : ""}`,
  );
  if (unmatched.length) {
    console.log(`SKIPPED, no matching price point (${unmatched.length}):`);
    unmatched.slice(0, 10).forEach((u) => console.log("  " + u));
  }
  if (!planned.length) return console.log("nothing to do");

  const byTerritory = {};
  for (const p of planned) (byTerritory[p.territory] ||= []).push(p);
  const keys = Object.keys(byTerritory).sort();
  for (const t of keys.slice(0, APPLY ? 1000 : 20)) {
    const cs = byTerritory[t];
    console.log(
      `  ${t} ${(cs[0].country || "").slice(0, 22).padEnd(23)} [${cs[0].band}] ${cs[0].currency}  ` +
        cs.map((c) => `${c.plan} ${c.from} -> ${c.to}`).join(", "),
    );
  }
  if (!APPLY) {
    if (keys.length > 20) console.log(`  ... and ${keys.length - 20} more territories`);
    console.log("\nDry run only. Re-run with --apply.");
    return;
  }

  let written = 0;
  const failed = [];
  for (const p of planned) {
    try {
      await post("/v1/subscriptionPrices", {
        data: {
          type: "subscriptionPrices",
          attributes: { startDate: START_DATE, preserveCurrentPrice: true },
          relationships: {
            subscription: { data: { type: "subscriptions", id: p.subscriptionId } },
            subscriptionPricePoint: { data: { type: "subscriptionPricePoints", id: p.pricePointId } },
            territory: { data: { type: "territories", id: p.territory } },
          },
        },
      });
      written += 1;
      process.stdout.write(`  written ${written}/${planned.length} (${p.territory} ${p.plan})      \r`);
    } catch (e) {
      failed.push(`${p.territory}/${p.plan}: ${e.message.split("\n")[0]}`);
    }
  }
  console.log(`\n\nwrote ${written}/${planned.length} price changes`);
  if (failed.length) {
    console.log(`FAILURES (${failed.length}):`);
    failed.slice(0, 15).forEach((f) => console.log("  " + f));
  }

  // ---- verify -----------------------------------------------------------
  console.log("\nverifying against the live schedule...");
  const intended = {};
  for (const p of planned) intended[`${p.plan}/${p.territory}`] = p.to;
  let ok = 0;
  const mismatched = [];
  for (const plan of config.plans) {
    const r = await getAll(
      `/v1/subscriptions/${asc.plans[plan].id}/prices?include=territory,subscriptionPricePoint&limit=200`,
    );
    const pp = {};
    for (const inc of r.included) if (inc.type === "subscriptionPricePoints") pp[inc.id] = inc.attributes;
    for (const d of r.data) {
      if (d.attributes.startDate !== START_DATE) continue;
      const key = `${plan}/${d.relationships.territory.data.id}`;
      if (!(key in intended)) continue;
      const point = pp[d.relationships.subscriptionPricePoint.data.id];
      if (!point) continue;
      const scheduled = Number(point.customerPrice);
      if (eq(scheduled, intended[key])) ok += 1;
      else mismatched.push(`${key}: wanted ${intended[key]}, scheduled ${scheduled}`);
    }
  }
  console.log(`verified: ${ok}/${planned.length} prices scheduled for ${START_DATE} as intended`);
  if (mismatched.length) {
    console.log(`MISMATCHES (${mismatched.length}):`);
    mismatched.slice(0, 20).forEach((m) => console.log("  " + m));
  }
})().catch((e) => {
  console.error("ERROR:", e.message);
  process.exit(1);
});

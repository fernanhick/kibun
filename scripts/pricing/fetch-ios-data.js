#!/usr/bin/env node
/**
 * Snapshot the App Store side into docs/pricing/data/:
 *   - the current per-territory price schedule for each subscription
 *   - the full price-point ladder per territory, so recommendations land on a
 *     real, selectable App Store price
 *
 * Apple reports `proceeds` per territory — revenue after local tax AND
 * commission — so unlike Play there is nothing to estimate.
 *
 * Credentials: see asc-client.js (ASC_KEY_PATH / ASC_KEY_ID / ASC_ISSUER_ID).
 * Usage: node scripts/pricing/fetch-ios-data.js
 */
const fs = require("fs");
const path = require("path");
const { get, getAll } = require("./asc-client.js");
const config = require("./app-config.js");

const OUT = config.dataDir;
const num = (v) => (v == null ? null : Number(v));

(async () => {
  fs.mkdirSync(OUT, { recursive: true });

  // ---- locate the subscriptions ----------------------------------------
  const groups = await get(`/v1/apps/${config.asc.appId}/subscriptionGroups?limit=20`);
  const byProductId = {};
  for (const g of groups.data) {
    const subs = await getAll(`/v1/subscriptionGroups/${g.id}/subscriptions?limit=50`);
    for (const s of subs.data) {
      byProductId[s.attributes.productId] = {
        id: s.id,
        productId: s.attributes.productId,
        name: s.attributes.name,
        period: s.attributes.subscriptionPeriod,
        state: s.attributes.state,
        group: g.attributes.referenceName,
      };
    }
  }
  const plans = {};
  for (const [plan, productId] of Object.entries(config.asc.products)) {
    if (!byProductId[productId]) throw new Error(`Subscription not found in ASC: ${productId}`);
    plans[plan] = byProductId[productId];
    console.log(`${plan.padEnd(8)} ${productId}  id=${plans[plan].id}  state=${plans[plan].state}`);
  }

  // ---- current prices ---------------------------------------------------
  const territoryCurrency = {};
  const current = {};
  for (const [plan, sub] of Object.entries(plans)) {
    const r = await getAll(
      `/v1/subscriptions/${sub.id}/prices?include=territory,subscriptionPricePoint&limit=200`,
    );
    const pp = {};
    for (const inc of r.included) {
      if (inc.type === "territories") territoryCurrency[inc.id] = inc.attributes.currency;
      if (inc.type === "subscriptionPricePoints") pp[inc.id] = inc.attributes;
    }
    current[plan] = {};
    for (const d of r.data) {
      const terr = d.relationships.territory.data.id;
      const point = pp[d.relationships.subscriptionPricePoint.data.id];
      if (!point) continue;
      current[plan][terr] = {
        currency: territoryCurrency[terr],
        customerPrice: num(point.customerPrice),
        proceeds: num(point.proceeds),
        startDate: d.attributes.startDate,
        preserved: d.attributes.preserved,
      };
    }
    console.log(`${plan.padEnd(8)} current prices: ${Object.keys(current[plan]).length} territories`);
  }

  // ---- per-territory price ladders --------------------------------------
  // The ladder is identical across an app's subscriptions, so fetch it once. It
  // comes back sorted ascending, so stop paging once it covers the highest price
  // we could need (the yearly plan).
  const anchorSubId = Object.values(plans)[0].id;
  const ladders = {};
  const terrList = Object.keys(current[config.plans[0]]);
  let done = 0;
  for (const terr of terrList) {
    const needUpTo = (current.yearly?.[terr]?.customerPrice ?? 0) * 2;
    const points = [];
    let page = `/v1/subscriptions/${anchorSubId}/pricePoints?filter[territory]=${terr}&limit=200`;
    for (let i = 0; i < 4 && page; i++) {
      const res = await get(page);
      for (const d of res.data) {
        points.push({
          id: d.id,
          customerPrice: num(d.attributes.customerPrice),
          proceeds: num(d.attributes.proceeds),
        });
      }
      if (points.length && points[points.length - 1].customerPrice >= needUpTo) break;
      const nx = res.links && res.links.next;
      page = nx ? nx.replace("https://api.appstoreconnect.apple.com", "") : null;
    }
    ladders[terr] = points;
    done += 1;
    process.stdout.write(`  ladders ${done}/${terrList.length} (${terr}: ${points.length})      \r`);
  }
  console.log(`\n  price ladders fetched for ${Object.keys(ladders).length} territories`);

  fs.writeFileSync(
    path.join(OUT, "asc-prices.json"),
    JSON.stringify(
      { fetchedAt: new Date().toISOString(), appId: config.asc.appId, plans, territoryCurrency, current, ladders },
      null,
      2,
    ),
  );
  console.log(`\nWrote ${path.join(OUT, "asc-prices.json")}`);
})().catch((e) => {
  console.error("ERROR:", e.message);
  process.exit(1);
});

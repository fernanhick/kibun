#!/usr/bin/env node
/**
 * Write recommended prices from docs/pricing/02-recommended-prices.csv to Google Play.
 *
 * SAFETY
 *  - Dry run by default. Nothing is written without --apply.
 *  - Existing subscribers are NOT migrated. Google keeps them on the price they
 *    signed up at; migrating needs a separate basePlans.batchMigratePrices call,
 *    which this script never makes.
 *  - The PATCH carries every region's config, not just changed ones, so no region
 *    can be dropped. It is atomic per product, so a bad payload changes nothing.
 *  - After writing, the grid is re-read and diffed against intent.
 *
 * Kibun has one product per billing period, so this patches each product
 * separately (unlike an app with one product carrying several base plans).
 *
 * Usage:
 *   node scripts/pricing/apply-play-prices.js                  # dry run, all
 *   node scripts/pricing/apply-play-prices.js --bands=D,E      # dry run, D+E
 *   node scripts/pricing/apply-play-prices.js --bands=D,E --apply
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const https = require("https");
const config = require("./app-config.js");

const args = process.argv.slice(2);
const APPLY = args.includes("--apply");
const argVal = (n) => {
  const a = args.find((x) => x.startsWith(`--${n}=`));
  return a ? a.split("=")[1] : null;
};
const ONLY = argVal("only") ? argVal("only").split(",").map((s) => s.trim().toUpperCase()) : null;
const BANDS = argVal("bands") ? argVal("bands").split(",").map((s) => s.trim().toUpperCase()) : null;
// Target specific action types (keep / cut / raise / normalize-annual). Lets the
// annual normalization ship on its own without dragging in same-band re-pricing.
const ACTIONS = argVal("actions") ? argVal("actions").split(",").map((s) => s.trim()) : null;

const b64 = (b) =>
  Buffer.from(b).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

function rq(options, body) {
  return new Promise((resolve, reject) => {
    const r = https.request(options, (res) => {
      let d = "";
      res.on("data", (c) => (d += c));
      res.on("end", () => resolve({ status: res.statusCode, body: d }));
    });
    r.on("error", reject);
    if (body) r.write(body);
    r.end();
  });
}

async function token() {
  const sa = JSON.parse(fs.readFileSync(config.play.serviceAccountPath, "utf8"));
  const now = Math.floor(Date.now() / 1000);
  const header = b64(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = b64(
    JSON.stringify({
      iss: sa.client_email,
      scope: "https://www.googleapis.com/auth/androidpublisher",
      aud: "https://oauth2.googleapis.com/token",
      exp: now + 3600,
      iat: now,
    }),
  );
  const s = crypto.createSign("RSA-SHA256");
  s.update(`${header}.${claim}`);
  const body = `grant_type=${encodeURIComponent(
    "urn:ietf:params:oauth:grant-type:jwt-bearer",
  )}&assertion=${header}.${claim}.${b64(s.sign(sa.private_key))}`;
  const res = await rq(
    {
      hostname: "oauth2.googleapis.com",
      path: "/token",
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Content-Length": Buffer.byteLength(body),
      },
    },
    body,
  );
  const j = JSON.parse(res.body);
  if (!j.access_token) throw new Error(`auth failed: ${res.body}`);
  return j.access_token;
}

function parseCsv(file) {
  const lines = fs.readFileSync(file, "utf8").trim().split(/\r?\n/);
  const head = lines[0].split(",");
  return lines.slice(1).map((line) => {
    const cells = [];
    let cur = "";
    let q = false;
    for (const ch of line) {
      if (ch === '"') q = !q;
      else if (ch === "," && !q) { cells.push(cur); cur = ""; }
      else cur += ch;
    }
    cells.push(cur);
    return Object.fromEntries(head.map((h, i) => [h, cells[i]]));
  });
}

const toUnits = (a) => {
  const units = Math.floor(a + 1e-9);
  return { units: String(units), nanos: Math.round((a - units) * 1e9) };
};
const fromPrice = (p) => Number(p.units || 0) + Number(p.nanos || 0) / 1e9;
const bpOf = (sub, product) => sub.basePlans.find((b) => b.basePlanId === product.basePlanId);

/**
 * Scale an offer phase price by the same proportion the base plan is moving, so
 * the offer keeps its existing discount instead of being flattened. Rounds down
 * and clamps, because the phase price must never exceed the base plan price.
 */
function scalePhasePrice(oldPhase, oldBase, newBase) {
  if (!(oldBase > 0)) return null;
  const scaled = newBase * (oldPhase / oldBase);
  const isInteger = Math.abs(oldPhase - Math.round(oldPhase)) < 1e-9;
  const rounded = isInteger ? Math.floor(scaled) : Math.floor(scaled * 100) / 100;
  return Math.min(rounded, newBase);
}

/**
 * Re-price an offer's priced phases to track a base-plan change.
 *
 * Order matters, because Google rejects any state where a phase price exceeds the
 * base plan price on a pro-rata basis:
 *   - going DOWN, the phase must be lowered BEFORE the base plan;
 *   - going UP, the phase must be raised AFTER it.
 * `direction` selects which half to apply, so callers run this twice around the
 * base-plan PATCH.
 */
async function syncOfferPhases(base, product, beforeBp, planChanges, H, direction) {
  const listRes = await rq({
    hostname: "androidpublisher.googleapis.com",
    path: `${base}/basePlans/${product.basePlanId}/offers?pageSize=50`,
    method: "GET",
    headers: H,
  });
  if (listRes.status === 204) return;
  if (listRes.status !== 200) throw new Error(`list offers -> ${listRes.status}: ${listRes.body.slice(0, 300)}`);
  const offers = JSON.parse(listRes.body).subscriptionOffers || [];
  const oldBase = Object.fromEntries(
    beforeBp.regionalConfigs.map((rc) => [rc.regionCode, fromPrice(rc.price)]),
  );

  for (const offer of offers) {
    let touched = 0;
    const phases = (offer.phases || []).map((ph) => ({
      ...ph,
      regionalConfigs: (ph.regionalConfigs || []).map((rc) => {
        const newBase = planChanges[rc.regionCode];
        if (!rc.price || newBase == null) return rc;
        const current = fromPrice(rc.price);
        const next = scalePhasePrice(current, oldBase[rc.regionCode], newBase);
        if (next == null || next <= 0) return rc;
        const goingDown = next < current;
        if (direction === "down" ? !goingDown : goingDown) return rc;
        touched += 1;
        const { units, nanos } = toUnits(next);
        return { ...rc, price: { currencyCode: rc.price.currencyCode, units, nanos } };
      }),
    }));
    if (!touched) continue;

    const payload = JSON.stringify({ ...offer, phases });
    const res = await rq(
      {
        hostname: "androidpublisher.googleapis.com",
        path:
          `${base}/basePlans/${product.basePlanId}/offers/${offer.offerId}` +
          `?updateMask=phases&regionsVersion.version=${encodeURIComponent(config.play.regionsVersion)}`,
        method: "PATCH",
        headers: { ...H, "Content-Type": "application/json", "Content-Length": Buffer.byteLength(payload) },
      },
      payload,
    );
    if (res.status !== 200) {
      throw new Error(`PATCH offer ${offer.offerId} -> ${res.status}: ${res.body.slice(0, 500)}`);
    }
    console.log(
      `  offer "${offer.offerId}": ${direction === "down" ? "lowered" : "raised"} ${touched} phase prices`,
    );
  }
}

(async () => {
  const rows = parseCsv(path.join(config.outDir, "02-recommended-prices.csv"));

  const wanted = {}; // plan -> region -> amount
  const changes = [];
  for (const r of rows) {
    if (r.action === "keep") continue;
    if (ONLY && !ONLY.includes(r.region)) continue;
    if (BANDS && !BANDS.includes(r.band)) continue;
    if (ACTIONS && !ACTIONS.includes(r.action)) continue;
    for (const plan of config.plans) {
      const cur = Number(r[`${plan}_current`]);
      const rec = Number(r[`${plan}_recommended`]);
      if (!isFinite(rec) || rec <= 0 || Math.abs(rec - cur) < 1e-9) continue;
      (wanted[plan] ||= {})[r.region] = rec;
      changes.push({ region: r.region, country: r.country, band: r.band, plan, cur, rec, currency: r.currency });
    }
  }

  const regions = new Set(changes.map((c) => c.region));
  console.log(
    `${APPLY ? "APPLY" : "DRY RUN"} — ${changes.length} price changes across ${regions.size} regions` +
      `${BANDS ? ` (bands ${BANDS.join(",")})` : ""}${ACTIONS ? ` (actions ${ACTIONS.join(",")})` : ""}` +
      `${ONLY ? ` (only ${ONLY.join(",")})` : ""}`,
  );
  if (!changes.length) return console.log("nothing to do");

  const byRegion = {};
  for (const c of changes) (byRegion[c.region] ||= []).push(c);
  const keys = Object.keys(byRegion).sort();
  for (const k of keys.slice(0, APPLY ? 1000 : 20)) {
    const cs = byRegion[k];
    console.log(
      `  ${k} ${(cs[0].country || "").slice(0, 22).padEnd(23)} [${cs[0].band}] ${cs[0].currency}  ` +
        cs.map((c) => `${c.plan} ${c.cur} -> ${c.rec}`).join(", "),
    );
  }
  if (!APPLY) {
    if (keys.length > 20) console.log(`  ... and ${keys.length - 20} more regions`);
    console.log("\nDry run only. Re-run with --apply.");
    console.log("Existing subscribers will NOT be migrated to the new prices.");
    return;
  }

  const tok = await token();
  const H = { Authorization: `Bearer ${tok}` };
  let okCount = 0;
  const problems = [];

  for (const product of config.play.products) {
    const planChanges = wanted[product.plan];
    if (!planChanges) continue;
    const base = `/androidpublisher/v3/applications/${config.play.packageName}/subscriptions/${product.productId}`;

    const beforeRes = await rq({ hostname: "androidpublisher.googleapis.com", path: base, method: "GET", headers: H });
    if (beforeRes.status !== 200) throw new Error(`GET ${product.productId} -> ${beforeRes.status}`);
    const before = JSON.parse(beforeRes.body);

    const nextBasePlans = before.basePlans.map((bp) => {
      if (bp.basePlanId !== product.basePlanId) return bp;
      return {
        ...bp,
        regionalConfigs: bp.regionalConfigs.map((rc) => {
          const amount = planChanges[rc.regionCode];
          if (amount == null) return rc;
          const { units, nanos } = toUnits(amount);
          return { ...rc, price: { currencyCode: rc.price.currencyCode, units, nanos } };
        }),
      };
    });

    // Offers that carry their own priced phase (the yearly "trial" offer discounts
    // the first year) must come down FIRST. Google rejects a base-plan price that
    // is lower than an offer phase price on a pro-rata basis, so cutting the base
    // plan without touching the offer fails the whole PATCH.
    await syncOfferPhases(base, product, bpOf(before, product), planChanges, H, "down");

    const url =
      `${base}?updateMask=basePlans` +
      `&regionsVersion.version=${encodeURIComponent(config.play.regionsVersion)}` +
      `&latencyTolerance=PRODUCT_UPDATE_LATENCY_TOLERANCE_LATENCY_SENSITIVE`;
    const payload = JSON.stringify({ ...before, basePlans: nextBasePlans });
    console.log(`\nPATCH ${product.productId} (regionsVersion ${config.play.regionsVersion}) ...`);
    const patched = await rq(
      {
        hostname: "androidpublisher.googleapis.com",
        path: url,
        method: "PATCH",
        headers: { ...H, "Content-Type": "application/json", "Content-Length": Buffer.byteLength(payload) },
      },
      payload,
    );
    if (patched.status !== 200) throw new Error(`PATCH ${product.productId} -> ${patched.status}: ${patched.body.slice(0, 600)}`);

    // Now the base plan is higher, any phase that needs to rise can follow it.
    await syncOfferPhases(base, product, bpOf(before, product), planChanges, H, "up");

    // verify
    const afterRes = await rq({ hostname: "androidpublisher.googleapis.com", path: base, method: "GET", headers: H });
    const after = JSON.parse(afterRes.body);
    const bpBefore = before.basePlans.find((b) => b.basePlanId === product.basePlanId);
    const bpAfter = after.basePlans.find((b) => b.basePlanId === product.basePlanId);
    for (const rc of bpAfter.regionalConfigs) {
      const target = planChanges[rc.regionCode];
      const now = fromPrice(rc.price);
      const prev = bpBefore.regionalConfigs.find((x) => x.regionCode === rc.regionCode);
      if (target != null) {
        if (Math.abs(now - target) < 0.005) okCount += 1;
        else problems.push(`${product.plan}/${rc.regionCode}: wanted ${target}, got ${now}`);
      } else if (prev && Math.abs(now - fromPrice(prev.price)) > 0.005) {
        problems.push(`UNINTENDED ${product.plan}/${rc.regionCode}: ${fromPrice(prev.price)} -> ${now}`);
      }
    }
    if (bpAfter.regionalConfigs.length !== bpBefore.regionalConfigs.length) {
      problems.push(`${product.plan}: region count changed`);
    }
  }

  console.log(`\nverified: ${okCount}/${changes.length} prices set as intended`);
  if (problems.length) {
    console.log(`PROBLEMS (${problems.length}):`);
    problems.slice(0, 20).forEach((p) => console.log("  " + p));
  } else {
    console.log("no unintended changes to any other region");
  }
  console.log("existing subscribers were not migrated (they keep their current price)");
})().catch((e) => {
  console.error("ERROR:", e.message);
  process.exit(1);
});

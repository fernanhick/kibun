#!/usr/bin/env node
/**
 * Snapshot every input the price model needs into docs/pricing/data/:
 *   - the live Google Play per-region price grid for each subscription product
 *   - Google's own local price point for each band anchor (convertRegionPrices),
 *     which also yields the authoritative tax rate per region
 *   - spot FX rates and World Bank GNI per capita PPP
 *
 * Auth: the Play service account in app-config.js (gitignored, never committed).
 *
 * Usage: node scripts/pricing/fetch-data.js
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const https = require("https");

const config = require("./app-config.js");
const { allAnchors } = require("./bands.js");

const OUT = config.dataDir;

const b64 = (b) =>
  Buffer.from(b).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

function req(options, body) {
  return new Promise((resolve, reject) => {
    const r = https.request(options, (res) => {
      let d = "";
      res.on("data", (c) => (d += c));
      res.on("end", () => resolve({ status: res.statusCode, body: d, headers: res.headers }));
    });
    r.on("error", reject);
    if (body) r.write(body);
    r.end();
  });
}

function getJson(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { "User-Agent": "kibun-pricing" } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return resolve(getJson(res.headers.location));
        }
        let d = "";
        res.on("data", (c) => (d += c));
        res.on("end", () => {
          try {
            resolve(JSON.parse(d));
          } catch {
            reject(new Error(`${url} -> ${res.statusCode}: ${d.slice(0, 200)}`));
          }
        });
      })
      .on("error", reject);
  });
}

async function playToken() {
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
  const signer = crypto.createSign("RSA-SHA256");
  signer.update(`${header}.${claim}`);
  const assertion = `${header}.${claim}.${b64(signer.sign(sa.private_key))}`;
  const body = `grant_type=${encodeURIComponent(
    "urn:ietf:params:oauth:grant-type:jwt-bearer",
  )}&assertion=${assertion}`;
  const res = await req(
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
  const json = JSON.parse(res.body);
  if (!json.access_token) throw new Error(`Play auth failed (${res.status}): ${res.body}`);
  return json.access_token;
}

const play = (token) => ({
  get: async (p) => {
    const r = await req({
      hostname: "androidpublisher.googleapis.com",
      path: p,
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (r.status !== 200) throw new Error(`GET ${p} -> ${r.status}: ${r.body.slice(0, 400)}`);
    return JSON.parse(r.body);
  },
  post: async (p, payload) => {
    const body = JSON.stringify(payload);
    const r = await req(
      {
        hostname: "androidpublisher.googleapis.com",
        path: p,
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body),
        },
      },
      body,
    );
    if (r.status !== 200) throw new Error(`POST ${p} -> ${r.status}: ${r.body.slice(0, 400)}`);
    return JSON.parse(r.body);
  },
});

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const token = await playToken();
  const api = play(token);

  // ---- current Play grid, one product per plan ---------------------------
  const grid = {};
  for (const p of config.play.products) {
    const sub = await api.get(
      `/androidpublisher/v3/applications/${config.play.packageName}/subscriptions/${p.productId}`,
    );
    const bp = sub.basePlans.find((b) => b.basePlanId === p.basePlanId);
    if (!bp) throw new Error(`base plan ${p.basePlanId} not found on ${p.productId}`);
    grid[p.plan] = {
      productId: p.productId,
      basePlanId: p.basePlanId,
      state: bp.state,
      raw: sub,
      regions: Object.fromEntries(
        bp.regionalConfigs.map((rc) => [
          rc.regionCode,
          {
            currency: rc.price.currencyCode,
            amount: Number(rc.price.units || 0) + Number(rc.price.nanos || 0) / 1e9,
            available: rc.newSubscriberAvailability !== false,
          },
        ]),
      ),
    };
    console.log(
      `Play ${p.plan.padEnd(8)} ${p.productId} / ${p.basePlanId}: ` +
        `${Object.keys(grid[p.plan].regions).length} regions, state ${bp.state}`,
    );
  }
  fs.writeFileSync(path.join(OUT, "play-grid.json"), JSON.stringify(grid, null, 2));

  // ---- Google's price calculator ----------------------------------------
  // Read-only: it calculates a locally idiomatic price point for every region for
  // a given USD amount, and reports the tax component, which gives us the
  // authoritative per-region tax rate for free.
  const anchorProduct = config.play.products[0].productId;
  const conversions = {};
  for (const usd of allAnchors()) {
    const units = Math.floor(usd);
    const nanos = Math.round((usd - units) * 1e9);
    const res = await api.post(
      `/androidpublisher/v3/applications/${config.play.packageName}/pricing:convertRegionPrices`,
      { price: { currencyCode: "USD", units: String(units), nanos } },
    );
    conversions[usd.toFixed(2)] = res.convertedRegionPrices;
    process.stdout.write(`  converted $${usd.toFixed(2)}        \r`);
  }
  fs.writeFileSync(path.join(OUT, "price-conversions.json"), JSON.stringify(conversions, null, 2));
  console.log(`Play price conversions: ${Object.keys(conversions).length} USD anchors`);
  void anchorProduct;

  // ---- reference data ----------------------------------------------------
  const fx = await getJson("https://open.er-api.com/v6/latest/USD");
  fs.writeFileSync(path.join(OUT, "fx-usd.json"), JSON.stringify(fx, null, 2));
  console.log(`FX: ${Object.keys(fx.rates).length} currencies, as of ${fx.time_last_update_utc}`);

  const wb = await getJson(
    "https://api.worldbank.org/v2/country/all/indicator/NY.GNP.PCAP.PP.CD?format=json&per_page=8000&date=2019:2025",
  );
  const latest = {};
  for (const r of wb[1] || []) {
    if (r.value == null || !r.countryiso3code) continue;
    const k = r.countryiso3code;
    if (!latest[k] || +r.date > +latest[k].year) {
      latest[k] = { iso3: k, country: r.country.value, year: r.date, gniPpp: r.value };
    }
  }
  fs.writeFileSync(path.join(OUT, "wb-gni-ppp.json"), JSON.stringify(Object.values(latest), null, 2));
  console.log(`World Bank: GNI per capita PPP for ${Object.keys(latest).length} economies`);

  const countries = await getJson("https://api.worldbank.org/v2/country?format=json&per_page=400");
  const map = {};
  for (const c of countries[1] || []) {
    if (c.iso2Code && c.id && c.region && c.region.value !== "Aggregates") {
      map[c.iso2Code] = {
        iso3: c.id,
        name: c.name,
        region: c.region.value,
        income: c.incomeLevel.value,
      };
    }
  }
  fs.writeFileSync(path.join(OUT, "iso2-map.json"), JSON.stringify(map, null, 2));
  console.log(`Country map: ${Object.keys(map).length} entries`);
  console.log(`\nWrote snapshots to ${OUT}`);
})().catch((e) => {
  console.error("ERROR:", e.message);
  process.exit(1);
});

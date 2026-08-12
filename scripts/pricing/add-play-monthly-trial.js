#!/usr/bin/env node
/**
 * Give the Play monthly base plan the same 7-day free trial the yearly plan and
 * both iOS plans already have.
 *
 * Why: app/paywall.tsx renders "billed monthly after trial" and a "7 days free"
 * CTA unconditionally, but monthly-pro had no offer at all on Play, so an Android
 * user picking Monthly was promised a trial and charged immediately.
 *
 * The yearly offer additionally discounts the first year; that is a pricing
 * decision, so it is NOT copied here. This creates a plain free-trial offer that
 * reverts to the base plan price, which is what the copy actually claims.
 *
 * Dry run by default. Usage:
 *   node scripts/pricing/add-play-monthly-trial.js
 *   node scripts/pricing/add-play-monthly-trial.js --apply
 */
const fs = require("fs");
const crypto = require("crypto");
const https = require("https");
const config = require("./app-config.js");

const APPLY = process.argv.includes("--apply");
const OFFER_ID = "trial";
const TRIAL_DURATION = "P7D";
const PLAN = config.play.products.find((p) => p.plan === "monthly");

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

(async () => {
  const tok = await token();
  const H = { Authorization: `Bearer ${tok}` };
  const base = `/androidpublisher/v3/applications/${config.play.packageName}/subscriptions/${PLAN.productId}`;

  // Regions come from the base plan itself, so the offer covers exactly what is sold.
  const subRes = await rq({ hostname: "androidpublisher.googleapis.com", path: base, method: "GET", headers: H });
  if (subRes.status !== 200) throw new Error(`GET subscription -> ${subRes.status}: ${subRes.body.slice(0, 300)}`);
  const bp = JSON.parse(subRes.body).basePlans.find((b) => b.basePlanId === PLAN.basePlanId);
  const regions = bp.regionalConfigs.map((rc) => rc.regionCode);

  const existing = await rq({
    hostname: "androidpublisher.googleapis.com",
    path: `${base}/basePlans/${PLAN.basePlanId}/offers?pageSize=50`,
    method: "GET",
    headers: H,
  });
  const already = existing.status === 200 ? JSON.parse(existing.body).subscriptionOffers || [] : [];
  console.log(
    `${APPLY ? "APPLY" : "DRY RUN"} — ${PLAN.productId}/${PLAN.basePlanId}: ` +
      `${regions.length} regions, existing offers: ${already.length ? already.map((o) => o.offerId).join(",") : "none"}`,
  );
  if (already.some((o) => o.offerId === OFFER_ID)) {
    return console.log(`offer "${OFFER_ID}" already exists — nothing to do`);
  }

  const offer = {
    packageName: config.play.packageName,
    productId: PLAN.productId,
    basePlanId: PLAN.basePlanId,
    offerId: OFFER_ID,
    regionalConfigs: regions.map((regionCode) => ({ regionCode, newSubscriberAvailability: true })),
    otherRegionsConfig: { otherRegionsNewSubscriberAvailability: true },
    // Only offer it to people who have never had this subscription.
    targeting: { acquisitionRule: { scope: { thisSubscription: {} } } },
    phases: [
      {
        recurrenceCount: 1,
        duration: TRIAL_DURATION,
        regionalConfigs: regions.map((regionCode) => ({ regionCode, free: {} })),
        otherRegionsConfig: { free: {} },
      },
    ],
  };

  console.log(`  would create offer "${OFFER_ID}": ${TRIAL_DURATION} free, all ${regions.length} regions`);
  if (!APPLY) return console.log("\nDry run only. Re-run with --apply.");

  const body = JSON.stringify(offer);
  const created = await rq(
    {
      hostname: "androidpublisher.googleapis.com",
      path:
        `${base}/basePlans/${PLAN.basePlanId}/offers?offerId=${OFFER_ID}` +
        `&regionsVersion.version=${encodeURIComponent(config.play.regionsVersion)}`,
      method: "POST",
      headers: { ...H, "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) },
    },
    body,
  );
  if (created.status !== 200) throw new Error(`create offer -> ${created.status}: ${created.body.slice(0, 600)}`);
  console.log(`  created, state: ${JSON.parse(created.body).state}`);

  // New offers land in DRAFT and have to be activated explicitly.
  const act = await rq(
    {
      hostname: "androidpublisher.googleapis.com",
      path: `${base}/basePlans/${PLAN.basePlanId}/offers/${OFFER_ID}:activate`,
      method: "POST",
      headers: { ...H, "Content-Type": "application/json", "Content-Length": 2 },
    },
    "{}",
  );
  if (act.status !== 200) throw new Error(`activate -> ${act.status}: ${act.body.slice(0, 400)}`);
  console.log(`  activated, state: ${JSON.parse(act.body).state}`);

  const verify = await rq({
    hostname: "androidpublisher.googleapis.com",
    path: `${base}/basePlans/${PLAN.basePlanId}/offers?pageSize=50`,
    method: "GET",
    headers: H,
  });
  const offers = JSON.parse(verify.body).subscriptionOffers || [];
  const mine = offers.find((o) => o.offerId === OFFER_ID);
  const freeRegions = (mine?.phases?.[0]?.regionalConfigs || []).filter((r) => r.free).length;
  console.log(`\nverified: offer "${OFFER_ID}" state=${mine?.state}, free in ${freeRegions}/${regions.length} regions`);
})().catch((e) => {
  console.error("ERROR:", e.message);
  process.exit(1);
});

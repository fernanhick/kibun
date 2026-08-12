// Everything app-specific about Kibun's pricing lives here. The rest of the
// scripts in this folder are app-agnostic, so porting this tooling to another app
// means writing a new version of this file and nothing else.
const path = require("path");

const ROOT = path.resolve(__dirname, "..", "..");

// US prices, which anchor the whole ladder. Both stores currently agree on these.
const US_MONTHLY = 5.99;
const US_YEARLY = 34.99;

module.exports = {
  name: "Kibun",
  root: ROOT,
  outDir: path.join(ROOT, "docs", "pricing"),
  dataDir: path.join(ROOT, "docs", "pricing", "data"),

  play: {
    packageName: "com.kibun.app",
    // Kibun uses one subscription product per billing period, each with a single
    // base plan. (SneakersBook instead used one product with three base plans, so
    // anything ported from there has to handle both shapes.)
    products: [
      { plan: "monthly", productId: "com.kibun.rc.monthly", basePlanId: "monthly-pro" },
      { plan: "yearly", productId: "com.kibun.rc.yearly", basePlanId: "yearly-pro" },
    ],
    serviceAccountPath:
      process.env.GOOGLE_PLAY_SERVICE_ACCOUNT ||
      path.join(ROOT, "api-project-146169649450-a4493526d571.json"),
    // Must be Google's current regions version or the PATCH is rejected outright.
    // The API names the correct value in the error if this goes stale.
    regionsVersion: process.env.PLAY_REGIONS_VERSION || "2025/03",
  },

  asc: {
    appId: process.env.ASC_APP_ID || "6761697507",
    products: {
      monthly: "com.kibun.rc.monthly",
      yearly: "com.kibun.rc.yearly",
    },
    // Apple's Small Business Program rate. Verified by checking that the USA
    // proceeds/customerPrice ratio is exactly this.
    commission: 0.85,
  },

  plans: ["monthly", "yearly"],

  /**
   * Yearly is priced as a fixed multiple of monthly so the paywall's "save X%"
   * badge means the same thing in every country.
   *
   * Kibun's existing US pricing implies 5.84x (a 51.3% annual saving), which is a
   * much steeper discount than typical. That is preserved deliberately rather than
   * normalized to something shallower — changing it is a pricing-strategy decision,
   * not a calibration one.
   */
  yearlyMultiple: US_YEARLY / US_MONTHLY,

  usAnchor: { monthly: US_MONTHLY, yearly: US_YEARLY },
};

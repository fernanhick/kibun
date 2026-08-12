// The price ladder. Shared by every script in this folder so the two stores can
// never drift apart.
//
// Each band is a net-of-tax USD anchor for the MONTHLY plan, expressed as a
// fraction of the US price. Yearly is derived from monthly by a fixed multiple.
//
// A country lands in a band by its affordability index: GNI per capita (PPP)
// relative to the US. The thresholds are deliberately coarse — five prices are
// operable, 170+ bespoke prices are not.
const config = require("./app-config.js");

const US = config.usAnchor.monthly;
const round2 = (n) => Math.round(n * 100) / 100;

// Ratios chosen so band A is US parity and band E is roughly 30% of it. Same
// shape used for SneakersBook, so the two apps stay comparable.
const BANDS = [
  { id: "A", label: "Parity", minIndex: 0.7, ratio: 1.0 },
  { id: "B", label: "Near-parity", minIndex: 0.45, ratio: 0.8 },
  { id: "C", label: "Mid", minIndex: 0.28, ratio: 0.6 },
  { id: "D", label: "Emerging", minIndex: 0.15, ratio: 0.4 },
  { id: "E", label: "Low-income", minIndex: 0, ratio: 0.3 },
].map((b) => ({ ...b, monthly: round2(US * b.ratio) }));

function anchorsFor(band) {
  return {
    monthly: band.monthly,
    yearly: round2(band.monthly * config.yearlyMultiple),
  };
}

function bandFor(index) {
  return BANDS.find((b) => index >= b.minIndex) || BANDS[BANDS.length - 1];
}

/** Every distinct USD anchor we need a store price conversion for. */
function allAnchors() {
  const set = new Set();
  for (const b of BANDS) {
    const a = anchorsFor(b);
    set.add(a.monthly);
    set.add(a.yearly);
  }
  return [...set].sort((x, y) => x - y);
}

module.exports = {
  BANDS,
  YEARLY_MULTIPLE: config.yearlyMultiple,
  anchorsFor,
  allAnchors,
  bandFor,
};

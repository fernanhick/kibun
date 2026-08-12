// Minimal App Store Connect API client (ES256 team-key JWT, no dependencies).
//
// Credentials come from the environment — never hardcode them, this file is tracked.
// Put them in the repo root .env (gitignored):
//
//   ASC_KEY_PATH=G:/My Drive/AuthKey_XXXXXXXXXX.p8
//   ASC_KEY_ID=XXXXXXXXXX
//   ASC_ISSUER_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
//
// The key needs App Manager (or Admin) access to read and write pricing.
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const https = require("https");

// Load the root .env if present, without clobbering real env vars.
(() => {
  const envPath = path.resolve(__dirname, "..", "..", ".env");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!m) continue;
    const key = m[1];
    if (process.env[key] !== undefined) continue;
    process.env[key] = m[2].trim().replace(/^["']|["']$/g, "");
  }
})();

const KEY_PATH = process.env.ASC_KEY_PATH;
const KEY_ID = process.env.ASC_KEY_ID;
const ISSUER_ID = process.env.ASC_ISSUER_ID;

if (!KEY_PATH || !KEY_ID || !ISSUER_ID) {
  throw new Error(
    "Missing App Store Connect credentials. Set ASC_KEY_PATH, ASC_KEY_ID and " +
      "ASC_ISSUER_ID (see the comment at the top of scripts/pricing/asc-client.js).",
  );
}

const pem = fs.readFileSync(KEY_PATH, "utf8");
const b64 = (b) =>
  Buffer.from(b).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

let cached = null;
function token() {
  const now = Math.floor(Date.now() / 1000);
  if (cached && cached.exp > now + 60) return cached.jwt;
  const header = b64(JSON.stringify({ alg: "ES256", kid: KEY_ID, typ: "JWT" }));
  const exp = now + 900; // Apple rejects anything over 20 minutes
  const payload = b64(JSON.stringify({ iss: ISSUER_ID, aud: "appstoreconnect-v1", iat: now, exp }));
  const sig = crypto.sign("sha256", Buffer.from(`${header}.${payload}`), {
    key: pem,
    dsaEncoding: "ieee-p1363",
  });
  cached = { jwt: `${header}.${payload}.${b64(sig)}`, exp };
  return cached.jwt;
}

function get(reqPath, attempt = 0) {
  return new Promise((resolve, reject) => {
    https
      .get(
        {
          hostname: "api.appstoreconnect.apple.com",
          path: reqPath,
          headers: { Authorization: `Bearer ${token()}` },
        },
        (res) => {
          let d = "";
          res.on("data", (c) => (d += c));
          res.on("end", () => {
            if ((res.statusCode === 429 || res.statusCode === 403) && attempt < 5) {
              // Apple throttles hard, and surfaces throttling as 403 as well as 429.
              return setTimeout(
                () => get(reqPath, attempt + 1).then(resolve, reject),
                2000 * 2 ** attempt,
              );
            }
            if (res.statusCode !== 200) {
              return reject(new Error(`ASC ${res.statusCode} ${reqPath}\n${d.slice(0, 400)}`));
            }
            try {
              resolve(JSON.parse(d));
            } catch {
              reject(new Error(`ASC bad JSON from ${reqPath}`));
            }
          });
        },
      )
      .on("error", reject);
  });
}

/** Follow links.next until the collection is exhausted. */
async function getAll(reqPath) {
  let data = [];
  let included = [];
  let next = reqPath;
  while (next) {
    const page = await get(next);
    data = data.concat(page.data || []);
    included = included.concat(page.included || []);
    const nx = page.links && page.links.next;
    next = nx ? nx.replace("https://api.appstoreconnect.apple.com", "") : null;
  }
  return { data, included };
}

function post(reqPath, payload, attempt = 0) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(payload);
    const req = https.request(
      {
        hostname: "api.appstoreconnect.apple.com",
        path: reqPath,
        method: "POST",
        headers: {
          Authorization: `Bearer ${token()}`,
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body),
        },
      },
      (res) => {
        let d = "";
        res.on("data", (c) => (d += c));
        res.on("end", () => {
          if ((res.statusCode === 429 || res.statusCode === 403) && attempt < 5) {
            return setTimeout(
              () => post(reqPath, payload, attempt + 1).then(resolve, reject),
              2000 * 2 ** attempt,
            );
          }
          if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
              return resolve(d ? JSON.parse(d) : {});
            } catch {
              return resolve({});
            }
          }
          reject(new Error(`ASC ${res.statusCode} POST ${reqPath}
${d.slice(0, 500)}`));
        });
      },
    );
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

module.exports = { get, getAll, post };

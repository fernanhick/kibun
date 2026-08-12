# ASO — read this before pasting anything into a store console

## ⚠️ `kibun.app` is not our domain

`kibun.app` belongs to an **unrelated product** — a status-sharing web app titled *"Kibun — Share your status in one click"*, with its own sign-in and billing pages. `kibun.app/privacy` and `kibun.app/terms` both return 200, serving **their** pages.

Our domain is **`kibun-app.com`**.

`ASO/V1`, `ASO/V2`, `ASO/V3` and `market-analysis/` are **historical records** and still contain `https://kibun.app/...` and `hello@kibun.app`. They have deliberately not been rewritten — but **do not paste from them**. Only `ASO/V4` has been corrected.

| Wrong (in V1–V3) | Correct |
|---|---|
| `https://kibun.app/privacy` | `https://www.kibun-app.com/privacy` ✅ live |
| `https://kibun.app/terms` | ❌ **no terms page exists yet** — see below |
| `hello@kibun.app` | `fernanhick@gmail.com` (see below) |

## Open blockers before the next listing update

1. **No terms page.** `kibun-app.com/terms` returns 404. iOS can use Apple's Standard EULA (`https://www.apple.com/legal/internet-services/itunes/dev/stdeula/`), which V4's Apple copy now does. **Play has no equivalent** — either publish a terms page on `kibun-app.com` or delete the Terms line from the Play description. V4 marks this inline.
2. **Support email is a personal Gmail.** `fernanhick@gmail.com` is what's currently registered with Apple and it works, so V4 uses it. Setting up `support@kibun-app.com` would be a meaningful trust upgrade for an app that asks people to log their emotional state — competitors ship under company identities (BlueSignum Corp., Relaxio s.r.o., Finch Care Public Benefit Corporation).
3. **Deep links are disabled.** `app.config.ts` no longer declares an `https://` prefix. Re-enabling Universal Links / App Links requires `apple-app-site-association` and `assetlinks.json` served from `kibun-app.com`. Don't add the prefix back until those are deployed and verified.

## Verify before you trust any doc in here

These files have drifted from the shipping app before. Before writing store copy, check the live sources:

- `https://itunes.apple.com/lookup?id=6761697507` — live iOS title, description, languages, ratings
- `https://play.google.com/store/apps/details?id=com.kibun.app&hl=en_US` — live Play listing
- `src/constants/theme.ts` — actual brand colours (sage/beige since 2026-06-17, **not** the blue/teal the older docs describe)
- `src/i18n/locales/en/screens.json` → `paywall.comparison.rows` — the actual free/Pro split
- `src/constants/moods.ts` — actual mood count (**18**)

Full context: `docs/growth/2026-07-29-why-no-downloads.md`.

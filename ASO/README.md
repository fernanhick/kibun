# ASO — read this before pasting anything into a store console

> ## ➤ Paste from `ASO/V6`
>
> **`ASO/V6/metadata-paste-package.md` (2026-08-30) is the current package.** It supersedes V5 §1–§4, covers **all four locales** (en / es / pt / de) on both stores, and every field is character-counted with zero token duplication.
>
> Descriptions still come from **`ASO/V4`** — V6 does not restate them.
>
> V5 was never pasted; its analysis stands but its values are superseded.

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

1. ~~**No terms page.**~~ ✅ **Resolved 2026-08-30.** `https://www.kibun-app.com/terms` now returns 200 in all four locales (`kibun-web` commit `2624698`). The Terms line in the V4 Play description can stay as written. iOS continues to point at Apple's Standard EULA.

   ⚠ §11 (governing law) does not name a jurisdiction — it says "the country in which the developer is established." Worth naming explicitly.
2. **Support email is a personal Gmail.** `fernanhick@gmail.com` is what's currently registered with Apple and it works, so V4 uses it. Setting up `support@kibun-app.com` would be a meaningful trust upgrade for an app that asks people to log their emotional state — competitors ship under company identities (BlueSignum Corp., Relaxio s.r.o., Finch Care Public Benefit Corporation).
3. **Deep links are disabled.** `app.config.ts` no longer declares an `https://` prefix. Re-enabling Universal Links / App Links requires `apple-app-site-association` and `assetlinks.json` served from `kibun-app.com`. Don't add the prefix back until those are deployed and verified.

## Verify before you trust any doc in here

These files have drifted from the shipping app before. Before writing store copy, check the live sources:

- `https://itunes.apple.com/lookup?id=6761697507` — live iOS title, description, languages, ratings
- `https://play.google.com/store/apps/details?id=com.kibun.app&hl=en_US` — live Play listing
- `src/constants/theme.ts` — actual brand colours (sage/beige since 2026-06-17, **not** the blue/teal the older docs describe)
- `src/i18n/locales/en/screens.json` → `paywall.comparison.rows` — the actual free/Pro split
- `src/constants/moods.ts` — actual mood count (**18**)

**Live search position, measured 2026-08-30:** Kibun ranks **#1 for `kibun`** and appears in the top 10 for **none** of 52 probed target keywords across the US, MX, ES, BR and DE storefronts. The app is indexed; it does not carry the words people search. Evidence and fix: `ASO/V6`.

Full context: `docs/growth/2026-07-29-why-no-downloads.md`.

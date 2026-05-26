# Kibun Test & Demo Accounts

This file documents the credentials for test/demo accounts used for QA, App Store review, and development. **Never commit real passwords or production secrets here.**

---

## App Store / QA Demo Account

- **Email:** fernanhick+kibun-review@gmail.com
- **Password:** Kibun-Review-2026!Sakura

This account is pre-seeded with mood entries and Pro features enabled for App Store review and QA. It is safe to reset/reseed using `scripts/seed-screenshot-user.mjs`.

---

## How to Change or Reseed
- To change the test account, update the `DEMO_EMAIL` and `DEMO_PASSWORD` environment variables in your local `.env` or CI/CD secrets.
- To reseed the account with fresh data, run:
  ```sh
  DEMO_EMAIL=fernanhick+kibun-review@gmail.com DEMO_PASSWORD=Kibun-Review-2026!Sakura node scripts/seed-screenshot-user.mjs
  ```

---

## Notes
- Do **not** store credentials in `.env` files that are committed to version control.
- For local testing, you may add these credentials to your personal `.env.local` (gitignored) for convenience.
- For App Store Connect, see `docs/app-store-submission.md` for reviewer instructions.

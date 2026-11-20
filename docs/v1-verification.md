# RentalShield NYC V1 verification

## Legacy baseline

On November 20, 2026, an isolated checkout of `1c636cd` passed `npm ci`, `npm run build`, `npm run lint`, and `npm run typecheck -- --incremental false`. It served the production build on port 3006 with legacy provider credentials absent.

- `node scripts/smoke-legacy.mjs` passed all three tests. It checks the analyze and disclaimer pages, health, the direct sample result, listing metadata preflight, missing-address and manual-address responses, upload validation, screenshot staging through the OCR fallback, and generated-result and missing-result routes.
- In the in-app browser, the contact-message flow requested an address. Continuing without one produced a scam report, and reloading the report restored it from the same browser session.
- The baseline exercised the deterministic scoring and OCR fallback. Live Bedrock, Google geocoding, RentCast, and Supabase-backed retrieval require their optional legacy integrations.

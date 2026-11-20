# RentalShield NYC V1 verification

## Legacy baseline

On November 20, 2026, an isolated checkout of `1c636cd` passed `npm ci`, `npm run build`, `npm run lint`, and `npm run typecheck -- --incremental false`. It served the production build on port 3006 with legacy provider credentials absent.

- `node scripts/smoke-legacy.mjs` passed all three tests. It checks the analyze and disclaimer pages, health, the direct sample result, listing metadata preflight, missing-address and manual-address responses, upload validation, screenshot staging through the OCR fallback, and generated-result and missing-result routes.
- In the in-app browser, the contact-message flow requested an address. Continuing without one produced a scam report, and reloading the report restored it from the same browser session.
- The baseline exercised the deterministic scoring and OCR fallback. Live Bedrock, Google geocoding, RentCast, and Supabase-backed retrieval require their optional legacy integrations.

## NYC public data

On November 20, 2026, `node scripts/smoke-nyc.mjs` confirmed all five borough examples through the report API. The Queens address kept its hyphenated house number and dropped the test unit suffix. The script queried both HPD datasets by exact BIN and grouped the shared tax lot independently by BIN.

| Public verification address | BIN | BBL | HPD building ID | Open Class B / C | Filing rows across the three cycles |
| --- | --- | --- | --- | --- | --- |
| 200 Riverside Drive | 1034113 | 1012520001 | 27211 | 1 / 0 | 3 |
| 1 Stuyvesant Oval | 1082881 | 1009720001 | 805341 | 1 / 0 | 5 |
| 2 Stuyvesant Oval | 1082769 | 1009720001 | 805345 | 0 / 0 | 3 |

The lot-wide groups included neighboring buildings. App counts and selected filings matched the exact-BIN rows for both apartments. The No. 2 building ID was corroborated using its historical violations. The zero in the open violations query came from a successful empty exact-BIN result. The filing rows included a late Riverside Drive submission and a later filing that superseded older No. 1 Stuyvesant Oval copies. Counts are a dated observation. Automated assertions use synthetic rows.

The browser confirmed A during an ambiguous B lookup for `100 Broadway`, displayed the candidate choices in B, and retained both confirmed Compare apartments while researching a different address. The right-arrow and Enter keys opened Block from Building & Rent.

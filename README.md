# RentalShield NYC

RentalShield NYC helps renters decide which NYC apartments to tour.

- **Research an Address** looks up a confirmed address in any of the five boroughs and shows housing and block records.
- **Compare Apartments** takes two addresses directly or restores a saved Apartment A. It compares asking rent, one-way travel, and public records using the same assumptions for both apartments.
- **Try a sample comparison** opens `/?demo=1&tab=compare` with fictional listings, synthetic records, and illustrative Transit and Walking estimates. It runs without upstream calls or API keys.
- **Scam checker** remains at `/analyze`. It accepts listing links, messages, and screenshots and links to the legacy sample at `/results/mock-manhattan-demo`.

## Local setup

Use Node.js 22 or later. The release checks were run with Node.js 24.

```bash
npm ci
npm run dev
```

Open [RentalShield on port 3006](http://localhost:3006). For a local production build, use `npm run build` followed by `npm run start -- -p 3006`.

The sample needs no environment file. For optional services, copy `.env.example` to a new `.env.local` and add server settings there. The five-borough address and records flows use public NYC Planning GeoSearch and NYC Open Data. `NYC_OPEN_DATA_APP_TOKEN` is optional and stays on the server.

Only the confirmed address for A and its optional asking rent are saved in versioned browser storage. B and shared destinations stay in the open app session. Clear baseline removes A from browser storage. Public metrics show the data source, reporting window or retrieval date, and availability.

## Optional Google Routes

`GOOGLE_ROUTES_ENABLED` defaults to `false`. When disabled, the reports and comparison remain usable and entered routes can be opened in Google Maps. `GOOGLE_ROUTES_API_KEY` is independent of the legacy `GOOGLE_MAPS_API_KEY` geocoding setting.

For a private smoke test, enable billing and the Routes API in the test Google Cloud project, restrict the key to Routes API and to the server where hosting supports that restriction, and add the key and `GOOGLE_ROUTES_ENABLED=true` to the private test environment. Restart the app after changing settings. Run Transit and Walking with two confirmed NYC origins and shared public destinations, including a supported outside-city pair such as Hoboken. Verify attribution, the walking notice, and usage counts. Turn the feature off by setting `GOOGLE_ROUTES_ENABLED=false` and restarting or redeploying.

Before public activation, publish Terms of Use and a Privacy Policy describing the address transfer to Google, apply a deployment-wide request limit to `POST /api/apartments/commutes`, and set Google Cloud daily and per-minute quotas from the owner's launch budget. Configure usage monitoring, quota alerts, and billing notifications. The adapter coalesces in-flight duplicates and caps each submission at six calls. Its per-session and per-instance limits supplement the shared deployment limit. Route data stays transient in memory and the API responses use `Cache-Control: private, no-store`. [Routes policies](https://developers.google.com/maps/documentation/routes/policies) · [Routes billing and quotas](https://developers.google.com/maps/documentation/routes/usage-and-billing)

## Scam checker

The original analysis, screenshot staging, and result routes support the Manhattan-focused scam checker. With legacy provider settings absent, the checker uses fallback analysis and the current browser session can reopen a generated result. Optional Bedrock, Google Geocoding, and RentCast settings enable provider-backed checks. Optional Supabase persistence requires the existing `rental_analyses` table and server credentials. Screenshot bytes are staged temporarily in the server process. Include a staging-to-analysis smoke test on the intended host if it runs the endpoints in separate instances.

## Verification

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

With the local app running on port 3006 in an isolated environment without legacy credentials, use `node scripts/smoke-legacy.mjs` for the scam checker and `node scripts/smoke-nyc.mjs` for the live NYC address and HPD joins. `RENTALSHIELD_SMOKE_URL` overrides the local smoke-test URL. Google Routes adapter tests use mocked responses. See the [V1 verification record](docs/v1-verification.md) for walkthroughs, screenshots, and pending live checks.

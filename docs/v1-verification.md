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

## Google Routes

- **Mock verification passed.** Tests cover shared waypoints and departure instants, Transit and Walking payloads, validation of NYC origins, an outside-city destination, partial results, disabled routing, no route, quota errors, timeouts, redaction, duplicate submissions, and the six-call maximum.
- **Live verification is pending.** Use a restricted, billing-enabled test key in a private environment to check actual Transit and Walking estimates, Hoboken coverage, attribution, quotas, and usage.
- **Public activation is pending.** The owner supplies the launch quota budget. Apply a shared request limit, provider quotas, and monitoring, then publish the required Terms of Use and Privacy Policy before enabling the feature in public.

## Release checks

The V1 production build ran from a credential-free checkout on `http://localhost:3006`. `npm ci`, `npm run lint`, `npm run typecheck`, `npm test` (18 tests), and `npm run build` passed. Both HTTP smoke scripts passed, including the three legacy cases and the public HPD checks above. The build emitted a non-blocking Browserslist data-age notice.

### First-time walkthrough

1. Opened the homepage in fresh Chrome contexts. **Research an Address** and **Compare Apartments** were equally prominent. Compare opened directly with A and B editable. An ambiguous A left the confirmed B in place. Picking A saved its confirmed address and asking rent.
2. Replaced A and B. A failed replacement and an ambiguous replacement preserved both confirmed selections. Swap reversed the rent and route differences and retained the Work, Gym, and Friends settings. Reload restored A and its rent. Clear baseline removed A and left B.
3. Researched a different address and switched to Block with the keyboard. An injected 311 timeout left the tree inventory usable and retry restored the noise count. A delayed search response could not replace the newer result. With browser storage blocked, the first confirmed Research address still seeded A for the session.
4. Opened the sample from the homepage and from its direct URL. The summary showed B costing $1,800 more over 12 months, Transit taking 41 minutes from A and 29 minutes from B one way, and B saving 12 minutes each morning and 60 minutes over five workdays. B had one fewer Class C violation and 15 more nearby noise reports. The sample made no public-data or Routes requests and preserved the saved A when entered and exited.
5. Read the two bedbug values side by side. A showed **0 units reported** and 54 total dwelling units. B showed **No filing found**, and the difference showed **Comparison unavailable**. Source links, record dates, radius, mode, departure, and workday count were visible without hovering. Walking estimates showed time-independent travel.
6. Calculated routes with the adapter disabled and confirmed that directions links were available. A mocked response with one timeout retained the other five estimates. Changing a destination invalidated its estimate. The official Google Maps attribution and walking notice rendered in the mocked live results.
7. Opened the scam checker and legacy sample from navigation. Submitted a synthetic message and PNG, continued after the address prompt, and reached the actual result page. Reloading restored the result and screenshot evidence from the browser session. The disclaimer was still reachable.

The in-app browser confirmed the production page title, sample flow, and absence of app warnings or errors in its console. Fresh Playwright Chrome contexts supplied precise desktop and mobile dimensions, isolated storage, and deterministic failure fixtures. The homepage and sample had no browser warnings, errors, or horizontal overflow at 1536, 390, and 320 pixels wide. The rendered controls had visible keyboard focus, and loading and error messages were exposed through live status regions.

### Visual review and screenshots

The homepage and Compare references were checked against the rendered screens for page order, serif headings, paper and sage colors, call-to-action parity, photo crop, and A/B grouping. A headline wrap that pushed the sample link below the desktop fold was fixed. Mobile uses one evidence card per metric with A and B paired above the difference. The reference artwork guided layout. The approved handoff determines the labels, dates, and sample values.

| View | Desktop · 1536 × 1024 | Mobile · 390 × 844 |
| --- | --- | --- |
| Homepage | [Desktop homepage](qa/home-desktop.png) | [Mobile homepage](qa/home-mobile.png) |
| Compare summary | [Desktop summary](qa/compare-summary-desktop.png) | [Mobile summary](qa/compare-summary-mobile.png) |
| Compare evidence | [Desktop detail](qa/compare-detail-desktop.png) | [Mobile detail](qa/compare-detail-mobile.png) |

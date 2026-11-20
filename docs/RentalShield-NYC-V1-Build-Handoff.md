# RentalShield NYC V1 developer build handoff

**Revised draft for final owner approval. Implementation starts after the owner explicitly approves this revision.**

RentalShield NYC helps someone moving to New York decide which apartments to tour. A renter can research one address or enter two apartments and compare them directly. Compare explains the tradeoffs in asking rent, building and block records, and one-way travel to shared destinations. The standalone app should work as a short, self-guided demo linked from the owner's portfolio.

## Release scope

Centralize **RentalShield NYC** as the working display name until the owner selects the new brand. Give **Research an Address** and **Compare Apartments** equal prominence on the homepage at `/`. Give the original scam checker a secondary navigation link to `/analyze` and keep its existing entry points usable.

| Area | V1 behavior |
| --- | --- |
| Address | Resolve NYC apartment addresses in either workflow. Run building and block checks after confirming each address. |
| Building & Rent | Show open Class B and Class C HPD violations, recent heat and hot-water complaints, annual bedbug filings where available, optional asking rent, and a link to request official apartment rent history. |
| Block | Show recent nearby 311 noise reports and street tree inventory information. |
| Commute | Use up to three shared addresses labeled Work, Gym, and Friends. Origins are in NYC's five boroughs. Destinations can be outside the city within provider coverage. Calculate live one-way transit and walking estimates when Google Routes is configured. |
| Compare | Enter A and B directly or reuse a saved A. Show a plain-language tradeoff summary, paired evidence and sources, and practical tour questions. Provide explicit controls to replace or swap apartments. |
| Portfolio demo | Open Compare with two fictional sample apartments, one shared Work destination, and explicitly labeled sample records and precomputed illustrative routes. |

The agreed defaults are a 300-meter neighborhood radius, 90 days of noise reports, 12 months of heat and hot-water reports, and the three most recent completed annual bedbug cycles. The shared transit departure defaults to 8:30 a.m. on the next weekday in New York and is editable. Weekly morning estimates default to five workdays. Gym destinations use manual address entry. Gym discovery and driving are deferred.

## User flows

### Homepage entry points

Present **Research an Address** and **Compare Apartments** as equally prominent actions before the renter enters an address. Research opens one address form. Compare opens forms for Apartment A and Apartment B together, with optional asking rent for each. A first-time visitor can submit both addresses directly from Compare. Offer **Try a sample comparison** as a separate link that opens the seeded comparison.

### Research an address

1. Prompt for a street address and borough or ZIP. Asking rent is optional and editable from the report.
2. On submission, resolve the address before making public-record queries. Show a short list with street, borough, and ZIP when the address needs disambiguation. For an unmatched address, ask the renter to check the house number or add the borough or ZIP. Show an upstream failure as a retryable lookup error.
3. Show the confirmed address and open **Building & Rent**. Start all applicable building and block queries together. Preserve successful sections when another source is slow or fails. Offer a retry and show the evidence status at each affected metric.
4. Let the renter switch between **Building & Rent**, **Block**, **Commute**, and **Compare**. Keep the address being researched visible in its report. Show the source, scope, and dates near each metric. Label asking rent as user-entered and link to the official rent-history request for unit-level records. [NYC rent-history guidance](https://www.nyc.gov/site/mayorspeu/programs/rent-stabilization.page)
5. Save the first confirmed research address as A when the baseline is empty. With a saved A, later searches update the research report independently. Show the saved A in Compare so the renter can choose explicitly whether to replace it.

### Commute

1. Add up to three destination addresses, with one slot each for Work, Gym, and Friends. Accept a street address plus city and state or ZIP, including places outside NYC when Google Routes can serve them. Validate five-borough coverage for the apartment origins.
2. Pick Transit or Walking and one departure time. Default to the next weekday at 8:30 a.m. New York time and allow the user to edit it. Submit with **Calculate routes**. Use the same request settings for both apartments when B is present.
3. Show estimated one-way, door-to-door time from the apartment to each destination, with a compact line or mode summary when the provider returns it. Label the mode **Transit** since an itinerary can include several means of travel. Show the selected departure date and New York time for transit. For Walking, show that the estimate is time-independent and hide the departure control.
4. Show an actionable state for disabled routing, no route, quota limits, timeouts, and provider errors. Keep the building and block report usable. Offer an **Open directions in Google Maps** link for the entered route when an in-app estimate is unavailable. Maps URLs work without a Routes key. [Google Maps URLs](https://developers.google.com/maps/documentation/urls/get-started)

### Compare and browser storage

1. Open with both address inputs available and prefill A when the browser has a saved baseline. Resolve both submissions through the same address and report services used by Research an Address. Keep validation and candidate choices attached to their original slots. A confirmed A becomes the baseline even if B still needs clarification. A confirmed B stays in its own slot while A is unresolved.
2. **Replace A** edits the baseline and saves it after successful confirmation. **Replace B** edits the second apartment. Keep the existing confirmed selection if the replacement fails, is ambiguous, or is canceled. **Swap A/B** exchanges both confirmed apartments and their asking rents, saves the new A, and recalculates the direction of the deltas. Keep shared destinations and routing assumptions attached to the comparison. Reuse results only when their source address and assumptions still match.
3. Store A's confirmed street address and optional asking rent in a versioned browser-storage entry. Restore it on refresh and refresh its records as needed. **Clear baseline** removes A from storage and leaves B in its own slot. If storage is disabled or invalid, keep the workflow usable in the current session. Keep B and destination addresses in session memory. Remove an explicit unit suffix from the building lookup and use the confirmed building address for storage and public-record queries.
4. Put the main tradeoffs before the detailed evidence. Follow with paired rent, one-way commute, housing and block rows, then up to three tour questions. Keep results readable when some inputs are missing. Use the same reporting windows, neighborhood radius, destination, travel mode, and applicable departure for both addresses. Allow two listings in one building with separate asking rents, reusing verified BIN-scoped evidence while preserving the scope of address-specific records.

### Portfolio demo and responsive layout

Provide a direct link such as `/?demo=1&tab=compare`. Load the demo locally with two fictional listings, a Work destination, both asking rents, sample public-record metrics, and precomputed transit and walking estimates. Use fixed fixture dates and display a persistent **Sample comparison** label plus **Sample estimate** beside route totals. Link to dataset documentation as context. Use synthetic records and itineraries created for the demo so the example carries no claims about real properties or Google Maps results. Preserve the user's saved baseline when entering and leaving the demo.

Use parallel A and B columns on desktop. On narrow screens, group A, B, and the difference under each metric so the renter can compare without horizontal scrolling. Keep persistent A and B labels, descriptive source links, keyboard access to the tabs, and visible focus. Make the reporting dates or radius, commute assumptions, and missing-data reasons visible alongside the relevant comparison. Announce search, loading, and error messages to assistive technology and surface status through text as well as color.

## Address resolution and building identity

Use NYC Planning GeoSearch `/v2/search` with the default search layers and a bounded candidate count. Read the candidate's street, house number, borough, postal code, geometry, and `addendum.pad.bin` and `addendum.pad.bbl` when present. A BIN is a Building Identification Number and a BBL identifies a borough, block, and tax lot. Keep both as strings. Preserve the hyphen and suffix in house numbers such as `45-45`. Normalize spaces, case, punctuation, and known street suffix forms conservatively. [NYC GeoSearch API](https://geosearch.planninglabs.nyc/docs/)

- Treat provider rank and confidence as hints. Require a compatible house number, street, and supplied borough or ZIP for automatic confirmation. GeoSearch returns some real house addresses under the `venue` layer, and different house numbers can have the same confidence. Require an explicit selection or fuller address when more than one building is plausible.
- Deduplicate address aliases only when they share a verified BIN. Require an explicit selection when more than one BIN is plausible, including multiple buildings at one address or on a shared lot. Treat placeholder identifiers such as `3000000` as missing. With a confirmed address point and an unavailable BIN, run eligible block, address-scoped 311, and commute checks and mark BIN-scoped records **Building identifier unavailable**.
- Join HPD violations and bedbug filings on the verified BIN. Return the BIN and any BBL with the records or aggregate groups and validate them against the selected identity before displaying counts. Use the BBL for corroboration. Surface unresolved BIN or lot conflicts as **Unavailable**. A zero HPD count requires a confirmed BIN and a successful, complete query for that BIN. Keep lot-wide queries for validation of the join.
- Match heat and hot-water reports to the exact normalized street address and borough, with ZIP or a compatible lot identifier when needed to disambiguate. Exclude rows with unresolved address conflicts. Label this metric as reports at the matched address. Support independently verified aliases only when they resolve to the same building. Avoid counting every 311 incident on a shared lot.
- Treat an address confirmed by the renter as an input to validate on the server. Resolve or validate it against the address service for report and routing calls. Bind results to the confirmed identity so a late response to a previous search cannot replace a newer report.

### Live HPD join validation

For release verification, compare the resolved BIN and BBL with the identifiers in current HPD violations and bedbug rows for a known match. Use 200 Riverside Drive, Manhattan (BIN `1034113`, BBL `1012520001`) as a starting case. When the rows have HPD's building identifier, cross-check `buildingid` in violations with `building_id` in the filing as additional evidence.

Exercise a shared lot using 1 and 2 Stuyvesant Oval, Manhattan. GeoSearch assigns BINs `1082881` and `1082769` on BBL `1009720001`. Query HPD for each BIN and separately group the lot's rows by BIN. Check that each app report matches the live rows for its own building and excludes neighbor BINs. Record the date, resolved identifiers, query scope, and observed result. Use mocked rows for stable count assertions because live records change. [HPD Violations](https://data.cityofnewyork.us/Housing-Development/Housing-Maintenance-Code-Violations/wvxf-dwi5) · [HPD Bedbug Reporting](https://data.cityofnewyork.us/Housing-Development/Bedbug-Reporting/wz6d-d3jb)

## Public data and metric definitions

Use the city Socrata JSON resources at `/resource/{dataset-id}.json`. Keep dataset IDs, query construction, and response parsing in the source adapters. Use bounded server-side aggregation for counts, and validate the response schema before interpreting an empty response or a numeric string. `NYC_OPEN_DATA_APP_TOKEN` can be sent as `X-App-Token` where supported. For radius queries, Socrata takes latitude, longitude, and meters. GeoJSON coordinates are supplied in longitude, latitude order. [Socrata application tokens](https://dev.socrata.com/docs/app-tokens.html) · [Socrata within_circle](https://dev.socrata.com/docs/functions/within_circle.html)

| Metric | Query and display rule | Official source |
| --- | --- | --- |
| Open HPD violations | Filter by `bin`, `violationstatus = 'Open'`, and `class IN ('B','C')`. Count distinct `violationid` by class and show B (hazardous) and C (immediately hazardous) separately. Include a bounded set of descriptions and notice dates when returned. The count covers all currently open matches as of the retrieval date. | [HPD Housing Maintenance Code Violations, wvxf-dwi5](https://data.cityofnewyork.us/Housing-Development/Housing-Maintenance-Code-Violations/wvxf-dwi5) |
| Heat and hot water | Match the building address as above. Filter `complaint_type` to `HEAT/HOT WATER` after case normalization, count distinct `unique_key`, and use the trailing 12 months of `created_date`. Show these as 311 service requests. | [311 Service Requests from 2020 to Present, erm2-nwe9](https://data.cityofnewyork.us/Social-Services/311-Service-Requests-from-2020-to-Present/erm2-nwe9) |
| Annual bedbug filings | Filter by `bin` and group by `filing_period_start_date` and `filling_period_end_date` (the API field uses two l's). Show each valid latest filing's period, filing date, `infested_dwelling_unit_count`, and total dwelling units (`of_dwelling_units`) when available. Identify these as building-level counts reported by the owner. | [HPD Bedbug Reporting, wz6d-d3jb](https://data.cityofnewyork.us/Housing-Development/Bedbug-Reporting/wz6d-d3jb) |
| Noise | Count distinct `unique_key` with a normalized `complaint_type` starting with `NOISE`, valid coordinates within 300 meters of the address point, and `created_date` in the last 90 days. Use the same filter for both addresses. Report the number as nearby 311 requests. | [311 Service Requests from 2020 to Present, erm2-nwe9](https://data.cityofnewyork.us/Social-Services/311-Service-Requests-from-2020-to-Present/erm2-nwe9) |
| Street tree sites | Count distinct `globalid` with `pssite = 'Street'` and `psstatus = 'Populated'` within 300 meters. Label the number **Populated street tree sites** and describe it as the Parks inventory. This single dataset supports street-specific counts. | [NYC Parks Forestry Planting Spaces, 82zj-84is](https://data.cityofnewyork.us/Environment/Forestry-Planting-Spaces/82zj-84is) |
| Asking rent and rent history | Accept optional monthly USD in valid cent increments. Store as integer cents. Provide **Request official apartment rent history** and send the renter to NYS Homes and Community Renewal. Label it as a tenant request, with the response mailed to the subject apartment. | [NYC rent-history instructions](https://www.nyc.gov/site/mayorspeu/programs/rent-stabilization.page) · [NYS HCR request form](https://portal.hcr.ny.gov/app/ask) |

### Windows, availability, and provenance

- Derive both reports from one server-generated reference date in `America/New_York`. For the two rolling 311 windows, use local midnight boundaries and an exclusive end at the start of today to omit the incomplete day. Subtract 90 calendar days for noise and 12 calendar months for heat and hot water. Show the resulting dates. Use the same bedbug cycles and radius on both addresses. Refresh both reports against one window when a cached report has a different reference date. Use HPD and Parks snapshots retrieved on the same reference date for a delta and show the retrieval date of each snapshot.
- HPD bedbug reporting covers November 1 through October 31, with the filing window in December. Use the three most recent cycles whose December filing windows have closed. For each verified BIN and cycle, choose the latest filing by `filing_date` and exclude superseded filings. Collapse duplicate copies. If latest filings with the same date conflict and there is no reliable submission order, mark that period **Unavailable**. Take both counts from the selected filing. A missing or malformed count stays unavailable even when the other count is usable. [HPD filing calendar](https://www.nyc.gov/site/hpd/services-and-information/bedbugs.page) · [HPD Bedbug Reporting](https://data.cityofnewyork.us/Housing-Development/Bedbug-Reporting/wz6d-d3jb)
- Use **No filing found** only when a complete query for the verified building finds no entry for that period. Use **0 units reported** only for an explicit zero in the selected owner filing. Pair it with the total when available, for example **0 units reported · 54 total dwelling units**. Identify both numbers as owner-reported. Show missing identifiers, failed queries, and unresolved filing conflicts as **Unavailable** with a concise reason.
- Attach the dataset name and URL, display scope, time window or inventory date, and retrieval timestamp to each measurement. Show the published update date if the adapter has it reliably. Preserve the difference between an event date, a reporting period, a dataset update, and the app's retrieval date.
- **0 matching records** means the source succeeded and returned a valid zero or empty match set for the indicated filter and identity. **Unavailable** covers source error, missing identity, incomplete results, and schema problems. **Not entered** covers optional rent and destinations. Preserve all states through API serialization, rendering, and comparison. A 311 count reflects reports, and the street tree count reflects the Parks inventory.

## Google Routes integration

### Request and response

- Add a server-only Routes adapter. Use `POST https://routes.googleapis.com/directions/v2:computeRoutes` with a restricted API key in the `X-Goog-Api-Key` header and a narrow `X-Goog-FieldMask`. Start with duration, distance, and the transit step fields needed for lines or mode labels. Validate apartment origin coordinates against confirmed addresses in NYC's five boroughs. Accept a manual destination as a Google Routes waypoint, including destinations outside NYC where the provider supports a route. Reuse the exact waypoint, direction, scheduling assumptions, and `travelMode` for both origins.
- Request apartment-to-destination routes for the selected mode per **Calculate routes** submission. Build one explicit ISO timestamp from the New York departure control and send the same instant on both transit calls. Handle daylight-saving time and validate the provider-supported time range. The UI can limit scheduling to the next 14 days. Walking uses Google Routes `WALK` and omits the transit departure parameter.
- Represent duration in seconds for deterministic arithmetic. Return compact route data keyed by origin, destination, and request assumptions, including status, duration, optional distance and transit lines, and retrieval time. Preserve successful pairs as other pairs fail. Display the required Google Maps attribution and walking route notice on live results. Before public live activation, publish Terms of Use and a Privacy Policy that meet Google's requirements and explain that routing sends addresses to Google when the user calculates a trip. [Compute Routes](https://developers.google.com/maps/documentation/routes/reference/rest/v2/TopLevel/computeRoutes) · [Transit requests](https://developers.google.com/maps/documentation/routes/transit-route) · [Walking mode](https://developers.google.com/maps/documentation/routes/reference/rest/v2/RouteTravelMode) · [Routes attribution and policies](https://developers.google.com/maps/documentation/routes/policies)

### Configuration, costs, and operations

| Control | Requirement |
| --- | --- |
| Activation and keys | Use server env values such as `GOOGLE_ROUTES_ENABLED` and `GOOGLE_ROUTES_API_KEY`. Default to disabled. Enable billing and Routes API in the Google Cloud project before activation. Restrict the key to Routes API and use a server application restriction where the hosting setup supports it. Keep the legacy `GOOGLE_MAPS_API_KEY` and its configuration independent. [Google key restrictions](https://developers.google.com/maps/api-security-best-practices) |
| Request limits | Validate a maximum of two origins and three destinations. Cap a submission at six upstream calls, including retries, for one mode. Coalesce identical in-flight requests within an active session, bound concurrency and timeouts, and suppress duplicate submits. Apply a deployment-wide or shared rate limit for public access and configure daily and per-minute provider quotas from the owner's launch budget. Favor manual retry after a quota rejection. [Routes API usage, billing, and quotas](https://developers.google.com/maps/documentation/routes/usage-and-billing) |
| Caching | Cache validated public city measurements and confirmed public address lookups separately using the identity, query window, radius, and source version in the key. Six hours for measurements and 24 hours for address lookups are starting TTLs. Keep the original retrieval time. Treat live Google route output as transient UI state. Use a no-store request and response path and exclude provider durations, instructions, and polylines from persistent storage and the HTTP or database cache. The sample estimates are local fixtures. [Routes storage policy](https://developers.google.com/maps/documentation/routes/policies) |
| Monitoring and limits | Track provider calls, latency, success, timeouts, and rate or quota errors by mode and deployment. Review Google Cloud usage and set quota alerts and billing notifications. Provider quotas and app rate limits enforce volume limits. Billing alerts notify the owner about spend. [Cloud Billing budgets](https://docs.cloud.google.com/billing/docs/how-to/budgets) |
| Degradation | Use typed timeout, throttled, no-route, and disabled responses with short UI messages and a manual retry when appropriate. Limit telemetry to operational fields. Exclude full addresses, API keys, and raw provider payloads from logs. |

## Comparison calculations and tour questions

Compute comparisons with pure TypeScript functions. Use B minus A internally and convert the sign to statements that name the apartment, magnitude, and unit. Supply both values, source links, and the shared assumptions in the detail row. Only compare like evidence. For example, pair 311 results from the same window and filter, owner-reported bedbug values from the same cycle, and route results for the same destination, mode, and scheduled departure.

| Comparison | Rule |
| --- | --- |
| Annual asking rent | `(B monthly cents − A monthly cents) × 12`. Show the monthly and annual differences for two entered rents. Label the annual figure as 12 months at the asking rent. |
| One-way morning commute | Lead with A and B's provider estimates to the same Work destination. Compute `B one-way seconds − A one-way seconds`. Show the travel mode and applicable departure date, time, and time zone. For a non-morning departure, use **One-way work commute** with the selected time. For Walking, label the estimate as time-independent. |
| Weekly morning commute | Compute `(B one-way seconds − A one-way seconds) × workdays per week` when both Work routes have equivalent assumptions. Default to five days and allow 1–7. Show the workday count and label the result **Weekly morning difference** for a morning departure or **Weekly one-way difference** for other settings. |
| Public records | Compute differences for compatible available values. Compare Class C and Class B counts independently. For bedbugs, pair the same cycle and show infested units and total dwelling units from the corresponding filings. Use neutral wording such as **15 more noise reports** or **55 fewer populated street tree sites**. Show unavailable values and their reasons in the side-by-side view. |
| Formatting | Compare integer cents, route seconds, and exact counts before display rounding. Keep equal values equal. Label a nonzero sub-minute route difference as **under 1 minute**. |

Use up to three summary lines. Give one line each to asking rent, the one-way Work estimates and their weekly difference, and the most relevant verified building-record difference when present. Prioritize a Class C difference over Class B, then recent heat or hot-water reports. When a summary slot has no comparable inputs, fill it with an available finding or say which input would enable it. Present V1 commute outputs as one-way travel. A future round-trip projection would require an explicit equal-return-duration label. A measured return estimate would require its own routing request.

Generate up to three tour questions in this priority order and link each to the apartment and evidence. An open Class C violation can prompt **What has been repaired, and can I see repair documentation?** A positive result in the latest bedbug filing can prompt **What treatment and follow-up were completed?** Two or more heat or hot-water reports in the window can prompt **How are outages handled in this building?** If a prior annual filing exists and the latest period has no filing, consider **Can I see the latest annual filing?** Use deterministic templates and keep complaint-based questions neutral and tied to reports.

### Demo example

Use a fixture pair with A at $2,650 per month, 41 minutes one way to Work by transit, one open Class C violation, and 25 noise reports. Set B to $2,800 per month, 29 minutes one way to the same Work destination, zero open Class C violations, and 40 noise reports. Use the same sample weekday departure at 8:30 a.m. New York time.

The seeded summary shows that B costs $1,800 more per year and has one fewer open Class C violation. Its **Sample estimate** shows 29 minutes to Work versus 41 minutes from A, saving 12 minutes each morning and 60 minutes per week over five workdays. The detail section shows B's 15 additional noise reports over the same window. Include a filed period with **0 units reported** and a total unit count, plus a separate period with **No filing found**.

## Technical architecture

Build on the existing Next.js App Router, React, strict TypeScript, Tailwind, and Zod stack. Treat `codex.md` and the existing README as context for the original scam checker. Reuse the current UI primitives and patterns where they fit. Give the new address report its own data model and namespace. The existing Google geocoding wrapper has a Manhattan-oriented fallback and belongs to the original flow.

| Responsibility | Suggested location and interface |
| --- | --- |
| Address resolution | `lib/apartments/address.ts` resolves validated queries to a confirmed address, disambiguation options, or typed failure. |
| Housing records | `lib/apartments/housing.ts` reads HPD violations, address-matched heat and hot-water reports, and annual bedbug filings. |
| Neighborhood data | `lib/apartments/neighborhood.ts` reads noise and populated street tree sites using a shared spatial and date definition. Reuse the Socrata client and 311 source adapter. |
| Routing | `lib/apartments/routing.ts` calls Google Routes and maps responses to the app's per-pair contract. Keep credentials and API calls on the server. |
| Comparison | `lib/apartments/comparison.ts` calculates compatible deltas, summary lines, and tour questions from typed reports and route results. Run these pure calculations wherever needed without a provider call. |
| Demo | `lib/apartments/demo.ts` holds internally authored fixtures with explicit sample provenance. Feed them into the same comparison and rendering modules. |
| Presentation | Expose both homepage entry points and reuse the same report components and services. Keep Research state independent of the saved Compare baseline. Track confirmed apartments by comparison slot and maintain the secondary entry to the scam checker. |

### API boundaries

- **POST `/api/apartments/report`** accepts one or two address inputs with their Research or Compare slot and any required candidate selections. Accept A and B together on their first submission. Return a shared reference window and results correlated to each slot, with confirmed identity, disambiguation options, or a typed error. For a confirmed match, run independent city requests concurrently with bounded timeouts and return partial success if a source fails.
- **POST `/api/apartments/commutes`** accepts one or two confirmed NYC origin addresses to validate, up to three destination addresses with stable IDs, one mode, and the selected departure when the mode uses it. Apply the NYC geography constraint to origins and let Google Routes determine destination coverage. Return the effective assumptions and one result per origin and destination. Distinguish a total request failure from a route unavailable for one pair.
- Use Zod at the request boundary and validate upstream shapes in each adapter. Keep SoQL filters fixed in the adapters and escape values derived from validated addresses. Keep personal addresses out of URLs for app API traffic and out of telemetry. Return the compact data the UI needs. Invalidate the affected route results and deltas when a user changes an address, destination, mode, or time. Ignore responses for the superseded request.
- Every report includes provenance (`live` or `demo`), a confirmed building identity or a typed resolution state, and an evidence status per metric. Every available metric carries its value, unit, source, definition, and dates. Compare rejects incompatible scopes and mixed provenance. Entering or leaving the demo switches the entire report context.

### Legacy behavior

Keep the original analysis form, validation, screenshot staging, listing preflight, analysis response types, optional integrations, and stored results behavior functional. Preserve the existing `/analyze`, `/results/[id]`, `/disclaimer`, `/api/analyze`, `/api/analyze/preflight`, `/api/analyze/[id]`, `/api/upload`, and `/api/health` entry points. Make the existing sample scam report discoverable from `/analyze`. Keep the new browser-storage key independent of the legacy result cache.

## Delivery sequence after approval

1. Verify the clean build and record the legacy smoke-test baseline. Add typed contracts, the demo fixtures, and the pure Compare functions. Build the key-free demo as the first complete portfolio flow.
2. Wire both homepage entry points to GeoSearch confirmation and the same NYC source adapters. Validate the live HPD joins, direct pair entry, Replace A, Replace B, Swap A/B, and baseline persistence during independent research.
3. Add the live Routes adapter and the quota, usage, and error controls. Wire shared destinations and route calculations into both origins. Document required server configuration and how to switch off live routing.
4. Verify the acceptance criteria with desktop and mobile screenshots and a first-time-user walkthrough. Update the README and environment example for both entry points, the key-free demo, optional live routing, and the legacy checker.

## Acceptance criteria

1. **Homepage and comparison entry.** Research an Address and Compare Apartments are equally easy to find on desktop and mobile. In a fresh session, Compare accepts A and B directly. Each slot retains its own candidate choices and errors.
2. **Baseline controls.** A survives refresh. Researching another address preserves the saved A. Replace A and Replace B update their own slots on confirmation. Swap A/B exchanges addresses and rents, persists the new A, and reverses the corresponding deltas while retaining shared destination and routing settings.
3. **Address accuracy and HPD validation.** Confirm a known address in each NYC borough, preserve a Queens hyphenated number, and ask the renter to choose when multiple buildings are plausible. Verify the joins against live HPD violations and bedbug data, including two different BINs on one lot. Missing or conflicting identifiers produce an unavailable state.
4. **Reports and filings.** Building and Block metrics show source, dates, and scope. Each bedbug period uses only the selected latest filing and displays its owner-reported infested and total dwelling unit counts when available. **No filing found**, **0 units reported**, and **Unavailable** are distinguishable. An adapter outage preserves other results and offers a retry.
5. **Commute and coverage.** Accept up to three manual destinations, including one outside NYC when supported. Validate that both origins are in NYC. Transit and Walking use identical destination, mode, and applicable departure settings for A and B. Lead with the one-way Work durations and compute weekly morning difference as the one-way difference times workdays. Keep missing or mismatched inputs out of the numerical deltas. A partial response, quota limit, or missing key leaves the rest of the report usable.
6. **Comparison and demo.** Lead with a plain-language tradeoff summary, followed by side-by-side evidence and up to three tour questions. One click and a direct demo URL open Compare with explicit sample labels, bypass upstream calls, and preserve the saved baseline. Verify that the sample shows 41 versus 29 minutes one way, 12 minutes of morning savings, and 60 minutes per week at five workdays.
7. **Visual and first-time review.** Capture desktop and mobile screenshots of the homepage and Compare summary and detail views. Complete a first-time walkthrough from a fresh browser profile. The user can start Compare directly, identify the main rent, morning travel, and building differences from the summary, and tell a zero from missing data. Verify that source links, reporting windows, mode, departure, and workdays are clear beside their metrics without requiring a hover interaction. The experience is readable at narrow widths and keyboard operable.
8. **Cost controls and legacy regression.** A submission sends at most six provider calls for one mode. The deployment configures route quotas and a public request limit before live activation. Tests cover throttling, duplicate clicks, timeout, and log redaction. Google route results remain transient. The original analysis, screenshot upload, and sample-result flow pass their smoke tests.

## Testing strategy

| Layer | Cases to cover |
| --- | --- |
| Unit | Test Queens hyphens, unit suffixes, equal-confidence wrong house numbers, ambiguous `100 Broadway`, duplicate aliases, placeholder BINs, and multiple BINs on one BBL. Cover valid zero, no filing, superseded and same-day conflicting filings, missing unit totals, and dates around year-end and daylight-saving changes. Test exact annual and one-way weekly arithmetic, changing workdays, swap direction, ties, unavailable values, and stale routing assumptions. |
| Adapter and API | Mock matched records, no records, malformed numbers, missing identifiers or unit counts, partial payloads, throttling, and source outage. Assert fixed query windows and exact building filters. Verify GeoJSON coordinate order, reject same-lot rows for other BINs, and preserve separate results for a partial A/B match. Accept outside-NYC destinations and reject outside-NYC origins. Check identical destination, mode, and applicable departure on A and B requests. |
| City data smoke test | Resolve 200 Riverside Drive in Manhattan, 300 Ashland Place in Brooklyn, 45-45 Center Boulevard in Queens, 851 Grand Concourse in the Bronx, and 100 Richmond Terrace in Staten Island. Run the [live HPD join validation](#live-hpd-join-validation), including both Stuyvesant Oval addresses, and record the evidence. |
| Routes smoke test | With owner-configured test billing, verify transit and walking using known routable pairs and two public NYC origins. Include a supported outside-city destination, such as a transit trip to Hoboken, NJ. Check attribution, quota settings, and usage visibility. Exercise disabled mode without a Routes key and use mocks in routine tests. |
| Browser and accessibility | Use a fresh browser to walk through both homepage entry points and a direct A/B submission. Exercise independent research, replace and swap controls, baseline refresh and clear, disambiguation, missing data, shared destinations, and the key-free demo. Review desktop and mobile screenshots for summary readability, source and assumption visibility, and missing-value copy. Include the screenshots and first-time walkthrough notes in the implementation readout. |
| Legacy and build | Run `npm ci`, `npm run lint`, `npm run typecheck`, and `npm run build`. Smoke-test `/analyze`, the listing preflight, message-based analysis, upload staging and validation, `/results/mock-manhattan-demo`, and result retrieval with the existing fallback or test configuration. The current dev script serves on port 3006. |

## Deferred work

- Construction activity, DOB permits, crime data, composite building or block scores, and universal apartment rankings.
- Driving estimates, gym discovery, return-leg routing, and round-trip projections. Manual Gym destinations are part of V1.
- Live listing ingestion, rent-comps models, automated unit-level rent-stabilization determinations, AI-generated explanations, and expansion of the legacy scam checker.
- Accounts, synced shortlists, sharing personal destinations, payments, alerts, and a custom maps or transit-routing platform.

## Developer chat kickoff prompt

```text
Read docs/RentalShield-NYC-V1-Build-Handoff.md, the repository instructions,
and the existing app structure. Start implementation only if my accompanying
message explicitly approves the reviewed handoff.

Implement the approved V1 in this repo. Use the centralized RentalShield NYC
name and give Research an Address and Compare Apartments equal prominence.
Start with the key-free demo using the shared comparison components. Add
direct A/B entry, explicit replace and swap controls, and baseline persistence.
Verify building joins against live HPD records. Route from confirmed NYC
origins to shared destinations within provider coverage and lead with one-way
morning commute estimates and the weekly one-way difference.

Preserve the legacy scam-checker routes and behavior. Keep the data adapters
modular, comparisons deterministic, and sample fixtures independent of live
data. Review desktop and mobile screenshots and record a first-time-user
walkthrough. Run the build, type, lint, and legacy smoke checks and report
which credential-dependent checks passed. Leave deferred items outside V1.
```

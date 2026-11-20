import assert from "node:assert/strict";

const origin = process.env.RENTALSHIELD_SMOKE_URL ?? "http://localhost:3006";
const examples = [
  ["research", "200 Riverside Drive", "Manhattan", "1034113", "1012520001"],
  ["research", "300 Ashland Place", "Brooklyn"],
  ["research", "45-45 Center Boulevard, Apt 9F", "Queens"],
  ["research", "851 Grand Concourse", "Bronx"],
  ["research", "100 Richmond Terrace", "Staten Island"],
];
const shared = [
  ["a", "1 Stuyvesant Oval", "Manhattan", "1082881", "1009720001"],
  ["b", "2 Stuyvesant Oval", "Manhattan", "1082769", "1009720001"],
];

async function reports(entries) {
  const response = await fetch(new URL("/api/apartments/report", origin), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ addresses: entries.map(([slot, street, area]) => ({ slot, input: { street, area } })) }),
    signal: AbortSignal.timeout(35_000),
  });
  assert.equal(response.status, 200);
  const result = await response.json();
  return result.results.map((outcome, index) => {
    const [slot, street, borough, bin, bbl] = entries[index];
    assert.equal(outcome.slot, slot);
    assert.equal(outcome.status, "confirmed", street + ": " + outcome.message);
    assert.equal(outcome.report.address.borough, borough);
    if (bin) assert.equal(outcome.report.address.bin, bin);
    if (bbl) assert.equal(outcome.report.address.bbl, bbl);
    return outcome.report;
  });
}

async function city(dataset, select, where, group, limit = 150) {
  const url = new URL("https://data.cityofnewyork.us/resource/" + dataset + ".json");
  for (const [key, value] of Object.entries({ select, where, group, limit })) {
    if (value != null) url.searchParams.set("$" + key, String(value));
  }
  const response = await fetch(url, { signal: AbortSignal.timeout(20_000) });
  assert.equal(response.status, 200, dataset);
  const result = await response.json();
  assert.ok(Array.isArray(result) && result.length < limit, "Expected complete city result for " + dataset);
  return result;
}

function openBy(filter) {
  return city("wvxf-dwi5", "bin,bbl,class,count(distinct violationid) as n",
    filter + " AND violationstatus='Open' AND class IN ('B','C')", "bin,bbl,class");
}

const filingFields = "bin,bbl,building_id,filing_period_start_date,filling_period_end_date,filing_date,infested_dwelling_unit_count,of_dwelling_units";

function cycleFilter(periods) {
  return "filing_period_start_date IN (" + periods.map(({ start }) => "'" + start + "T00:00:00'").join(",") + ")";
}

async function verifyHpd(report, lot) {
  assert.equal(report.violations.status, "available", report.violations.reason);
  assert.equal(report.bedbugs.status, "available", report.bedbugs.reason);
  const { bin, bbl, street } = report.address;
  const filter = "bin='" + bin + "'";
  const byCycle = cycleFilter(report.window.bedbugs);
  const [open, filings, historical] = await Promise.all([
    openBy(filter),
    city("wz6d-d3jb", filingFields, filter + " AND " + byCycle),
    city("wvxf-dwi5", "bin,bbl,buildingid,count(violationid) as n", filter, "bin,bbl,buildingid"),
  ]);
  for (const row of [...open, ...filings, ...historical]) {
    assert.equal(row.bin, bin);
    if (row.bbl) assert.equal(row.bbl, bbl);
  }
  const cityIds = new Set(historical.map((row) => row.buildingid).filter(Boolean));
  assert.equal(cityIds.size, 1);
  const [buildingId] = cityIds;
  assert.ok(filings.length > 0);
  assert.ok(filings.every((row) => row.building_id === buildingId));
  assert.equal(report.bedbugs.scope.building.hpdBuildingId, buildingId);
  assert.equal(report.bedbugs.scope.building.bin, bin);
  assert.equal(report.violations.scope.building.bin, bin);
  const counts = Object.fromEntries(["B", "C"].map((k) => [k, open.filter((row) => row.class === k).reduce((n, row) => n + Number(row.n), 0)]));
  for (const level of ["B", "C"]) assert.equal(report.violations.value[level].count, counts[level]);

  for (const period of report.bedbugs.value) {
    const matches = filings.filter((row) => row.filing_period_start_date.slice(0, 10) === period.period.start &&
      row.filling_period_end_date.slice(0, 10) === period.period.end);
    if (!matches.length) {
      assert.equal(period.status, "no-filing");
      continue;
    }
    const dates = matches.map((row) => row.filing_date.slice(0, 10)).sort();
    const latest = matches.filter((row) => row.filing_date.startsWith(dates.at(-1)));
    const pairs = new Set(latest.map((row) => JSON.stringify([row.infested_dwelling_unit_count, row.of_dwelling_units])));
    if (pairs.size > 1) {
      assert.equal(period.status, "unavailable");
    } else {
      assert.equal(period.status, "filed");
      const [selected] = latest;
      assert.equal(period.filedOn, dates.at(-1));
      assert.equal(period.infested, selected.infested_dwelling_unit_count == null ? null : Number(selected.infested_dwelling_unit_count));
      assert.equal(period.total, selected.of_dwelling_units == null ? null : Number(selected.of_dwelling_units));
    }
  }

  if (lot) {
    assert.deepEqual(lot.open.filter((row) => row.bin === bin), open);
    assert.equal(lot.filings.filter((row) => row.bin === bin).reduce((n, row) => n + Number(row.n), 0), filings.length);
  }
  console.log(`${report.window.asOf} · ${street} · BIN ${bin} · BBL ${bbl} · HPD ${buildingId} · open B/C ${counts.B}/${counts.C} · ${filings.length} source filing rows across three cycles`);
}

const singleReports = [];
for (const entry of examples) {
  const [report] = await reports([entry]);
  assert.equal(report.address.street, entry[1].replace(", Apt 9F", ""));
  singleReports.push(report);
  console.log("Confirmed " + report.address.borough + " via app report.");
}

const [riverside] = singleReports;
await verifyHpd(riverside);
const pair = await reports(shared);
assert.equal(pair[0].window.asOf, pair[1].window.asOf);
const lotScope = "bbl='1009720001'";
const [open, filings] = await Promise.all([
  openBy(lotScope),
  city("wz6d-d3jb", "bin,bbl,count(*) as n",
    lotScope + " AND " + cycleFilter(pair[0].window.bedbugs), "bin,bbl"),
]);
const ordered = (rows) => rows.sort((a, b) => (a.bin + a.class).localeCompare(b.bin + b.class));
assert.ok(open.some((row) => !pair.some((report) => report.address.bin === row.bin)));
assert.ok(filings.some((row) => !pair.some((report) => report.address.bin === row.bin)));
await verifyHpd(pair[0], { open: ordered(open), filings });
await verifyHpd(pair[1], { open: ordered(open), filings });
console.log("Shared-lot groups include neighbor BINs. Both app reports match only their own BIN.");

import assert from "node:assert/strict";
import test from "node:test";

import { addressMatches, createAddressResolver } from "../../lib/apartments/address";
import { reportingWindow } from "../../lib/apartments/calendar";
import type { ApartmentAddress, Resolution } from "../../lib/apartments/contracts";
import { readBedbugs, readViolations, selectFilings } from "../../lib/apartments/housing";
import { createReportService } from "../../lib/apartments/report";
import { CityDataError, createSocrataClient, type CityRow } from "../../lib/apartments/socrata";

const now = new Date("2026-11-20T18:00:00.000Z");
const window = reportingWindow(now);
const a: ApartmentAddress = {
  key: "1|STUYVESANT OVAL|Manhattan|1082881", street: "1 Stuyvesant Oval", borough: "Manhattan",
  zip: "10009", latitude: 40.73001, longitude: -73.97863, bin: "1082881", bbl: "1009720001",
};

function feature(housenumber: string, street: string, borough: string, zip: string, bin: string, bbl?: string) {
  return {
    geometry: { type: "Point", coordinates: [-73.956, 40.751] },
    properties: { layer: "venue", confidence: 1, housenumber, street, borough, postalcode: zip, addendum: { pad: { bin, bbl } } },
  };
}
const collection = (...features: unknown[]) => ({ type: "FeatureCollection", features });

test("GeoSearch preserves Queens hyphens and house suffixes and ignores equally ranked wrong numbers", () => {
  const wrong = feature("45-40", "CENTER BOULEVARD", "Queens", "11109", "4541712");
  const right = feature("45-45A", "CENTER BOULEVARD", "Queens", "11109", "4541713", "4000210020");
  const match = addressMatches(collection(wrong, right), { street: "45-45A Center Blvd., Apt 11F", area: "Queens" });
  assert.equal(match.status, "confirmed");
  if (match.status !== "confirmed") return;
  assert.equal(match.address.street, "45-45A Center Boulevard");
  assert.equal(match.address.longitude, -73.956);
  assert.equal(match.address.latitude, 40.751);
  const plaza = feature("1", "UNITED NATIONS PLAZA", "Manhattan", "10017", "1037588");
  assert.equal(addressMatches(collection(plaza), { street: "1 United Nations Plaza #4B", area: "Manhattan" }).status, "confirmed");
  assert.equal(addressMatches(collection(wrong), { street: "45-45A Center Blvd", area: "Queens" }).status, "unmatched");
});

test("GeoSearch accepts ordinal numbered streets and avenues with exact building and area matches", async () => {
  const avenue = feature("222", "1 AVENUE", "Manhattan", "10009", "1000101", "1004410001");
  const street = feature("222", "EAST 12 STREET", "Manhattan", "10003", "1000102");
  const candidates = collection(avenue, street);
  const queries: (string | null)[] = [];
  const resolve = createAddressResolver(async (request) => {
    queries.push(new URL(String(request)).searchParams.get("text"));
    return Response.json(candidates);
  });

  const first = await resolve({ street: "222 1st Ave, Apt QA-4", area: "10009" });
  assert.equal(first.status === "confirmed" && first.address.key, "222|1 AVENUE|Manhattan|1000101");
  assert.equal(first.status === "confirmed" && first.address.bbl, "1004410001");
  const second = await resolve({ street: "222 E 12th St.", area: "10003" });
  assert.equal(second.status === "confirmed" && second.address.key, "222|EAST 12 STREET|Manhattan|1000102");
  assert.deepEqual(queries, ["222 1 AVENUE, 10009", "222 EAST 12 STREET, 10003"]);
  assert.equal(addressMatches(candidates, { street: "222 1st Ave, QA-4 / 10009" }).status, "confirmed");
  assert.equal(addressMatches(candidates, { street: "222 1st Ave", area: "10003" }).status, "unmatched");
  assert.equal(addressMatches(candidates, { street: "222 1st Ave", area: "Brooklyn" }).status, "unmatched");
  assert.equal(addressMatches(candidates, { street: "222 W 12th St", area: "Manhattan" }).status, "unmatched");
  assert.equal(addressMatches(candidates, { street: "223 1st Ave", area: "10009" }).status, "unmatched");
  const anotherBin = feature("222", "1ST AVE", "Manhattan", "10009", "1000103", "1004410001");
  assert.equal(addressMatches(collection(avenue, anotherBin), { street: "222 1st Ave", area: "10009" }).status, "choose");
});

test("listing ambiguity is per verified BIN, including aliases, same-zip context, and a shared lot", () => {
  const aliases = [
    feature("100", "B'WAY", "Brooklyn", "11249", "3324734", "3021310001"),
    feature("100", "BROADWAY", "Brooklyn", "11249", "3324734", "3021310001"),
  ];
  const other = feature("100", "BROADWAY", "Manhattan", "10005", "1001024", "1000480002");
  const match = addressMatches(collection(...aliases, other), { street: "100 Broadway" });
  assert.equal(match.status, "choose");
  if (match.status !== "choose") return;
  assert.equal(match.candidates.length, 2);
  assert.equal(addressMatches(collection(...aliases, other), { street: "100 Broadway", selection: match.candidates[1].key }).status, "confirmed");
  const twoBins = collection(...aliases, feature("100", "BROADWAY", "Brooklyn", "11249", "3324735", "3021310001"));
  assert.equal(addressMatches(twoBins, { street: "100 Broadway", area: "Brooklyn" }).status, "choose");
  assert.equal(addressMatches(collection(...aliases), { street: "100 Broadway", area: "10005" }).status, "unmatched");
});

test("GeoSearch requires all pasted and explicit borough and ZIP hints to match", () => {
  const brooklyn = feature("100", "BROADWAY", "Brooklyn", "11249", "3324734");
  const manhattan = feature("100", "BROADWAY", "Manhattan", "10005", "1001024");
  const candidates = collection(brooklyn, manhattan);

  for (const input of [
    { street: "100 Broadway, Brooklyn, NY 10005" },
    { street: "100 Broadway, Brooklyn NY 10005" },
    { street: "100 Broadway, Brooklyn", area: "10005" },
    { street: "100 Broadway, NY 10005", area: "Brooklyn" },
    { street: "100 Broadway, Brooklyn", area: "10005", selection: "100|BROADWAY|Manhattan|1001024" },
  ]) {
    assert.equal(addressMatches(candidates, input).status, "unmatched", JSON.stringify(input));
  }
  assert.equal(addressMatches(candidates, { street: "100 Broadway, Brooklyn", area: "Manhattan" }).status, "invalid");
  assert.equal(addressMatches(candidates, { street: "100 Broadway, 11249, 10005" }).status, "invalid");

  const confirmed = addressMatches(candidates, { street: "100 Broadway, Apt 12345, Brooklyn NY 11249-1234", area: "11249" });
  assert.equal(confirmed.status === "confirmed" && confirmed.address.borough, "Brooklyn");
  const noHint = addressMatches(collection(brooklyn), { street: "100 Broadway, Apt 12345" });
  assert.equal(noHint.status, "choose");
});

test("a cached ZIP-only match cannot resolve a conflicting borough and ZIP", async () => {
  let lookups = 0;
  const resolver = createAddressResolver(async () => {
    lookups++;
    return Response.json(collection(feature("100", "BROADWAY", "Manhattan", "10005", "1001024")));
  });
  assert.equal((await resolver({ street: "100 Broadway", area: "10005" })).status, "confirmed");
  assert.equal((await resolver({ street: "100 Broadway, Brooklyn", area: "10005" })).status, "unmatched");
  assert.equal((await resolver({ street: "100 Broadway, Brooklyn", area: "Manhattan" })).status, "invalid");
  assert.equal(lookups, 2);
});

test("stripping an explicit unit preserves borough and ZIP on either side of it", () => {
  const brooklyn = feature("100", "BROADWAY", "Brooklyn", "11249", "3324734");
  const manhattan = feature("100", "BROADWAY", "Manhattan", "10005", "1001024");
  const candidates = collection(brooklyn, manhattan);
  for (const street of [
    "100 Broadway, Apt 4 Brooklyn NY ZIP",
    "100 Broadway Apt. #4B Brooklyn N.Y. ZIP",
    "100 Broadway # 4-B Brooklyn, NY ZIP",
    "100 Broadway, Brooklyn Unit 4B NY ZIP",
    "100 Broadway, Brooklyn NY ZIP Suite 4B",
  ]) {
    assert.equal(addressMatches(candidates, { street: street.replace("ZIP", "10005") }).status, "unmatched", street);
    const matched = addressMatches(candidates, { street: street.replace("ZIP", "11249-1234") });
    assert.equal(matched.status === "confirmed" && matched.address.street, "100 Broadway", street);
    assert.equal(matched.status === "confirmed" && matched.address.borough, "Brooklyn", street);
  }
  assert.equal(addressMatches(candidates, { street: "100 Broadway, Apt 4 Brooklyn", area: "10005" }).status, "unmatched");
  assert.equal(addressMatches(candidates, { street: "100 Broadway Unit 4 NY 11249", area: "Manhattan" }).status, "unmatched");
  assert.equal(addressMatches(candidates, { street: "100 Broadway, Brooklyn Apt 4 Manhattan NY 10005" }).status, "invalid");
  assert.equal(addressMatches(collection(brooklyn), { street: "100 Broadway, Apt # 12345" }).status, "choose");
});

test("pasted locality punctuation and country suffixes preserve borough and ZIP constraints", () => {
  const brooklyn = feature("100", "BROADWAY", "Brooklyn", "11249", "3324734");
  const manhattan = feature("100", "BROADWAY", "Manhattan", "10005", "1001024");
  const candidates = collection(brooklyn, manhattan);
  for (const suffix of [".", ";", " USA", " U.S.", " U.S.A.", ". United States of America.", ", USA"]) {
    for (const zip of ["11249", "11249-1234"]) {
      const street = `100 Broadway, Apt 4B Brooklyn NY ${zip}${suffix}`;
      assert.equal(addressMatches(candidates, { street, area: "Manhattan" }).status, "invalid", street);
      assert.equal(addressMatches(candidates, { street, area: "10005" }).status, "invalid", street);
      assert.equal(addressMatches(candidates, { street, area: "11249" }).status, "confirmed", street);
      const confirmed = addressMatches(candidates, { street });
      assert.equal(confirmed.status === "confirmed" && confirmed.address.borough, "Brooklyn", street);
    }
  }
  assert.equal(addressMatches(candidates, { street: "100 Broadway, Apt 4B Brooklyn. USA", area: "Manhattan" }).status, "invalid");
  assert.equal(addressMatches(candidates, { street: "100 Broadway, Apt 11249, USA." }).status, "choose");
  assert.equal(addressMatches(candidates, { street: "100 Broadway, NY 112491 USA" }).status, "choose");
});

test("a pasted ZIP with a country suffix cannot reuse a conflicting cached or selected address", async () => {
  const queries: (string | null)[] = [];
  const resolver = createAddressResolver(async (request) => {
    queries.push(new URL(String(request)).searchParams.get("text"));
    return Response.json(collection(feature("100", "BROADWAY", "Manhattan", "10005", "1001024")));
  });
  const warm = await resolver({ street: "100 Broadway", area: "Manhattan" });
  assert.equal(warm.status, "confirmed");
  if (warm.status !== "confirmed") return;
  const street = "100 Broadway, Apt 4B NY 11249 U.S.A.";
  assert.equal((await resolver({ street, area: "Manhattan" })).status, "unmatched");
  assert.equal((await resolver({ street, area: "Manhattan", selection: warm.address.key })).status, "unmatched");
  assert.deepEqual(queries, ["100 BROADWAY, Manhattan", "100 BROADWAY, 11249", "100 BROADWAY, 11249"]);
});

test("malformed responses and placeholder IDs do not yield a fake building", async () => {
  const unresolved = feature("170", "ASHLAND PLACE", "Brooklyn", "11217", "3000000", "3020950026");
  const match = addressMatches(collection(unresolved, { properties: { layer: "street" } }), { street: "170 Ashland Pl", area: "11217" });
  assert.equal(match.status, "confirmed");
  if (match.status === "confirmed") assert.equal(match.address.bin, undefined);
  const resolver = createAddressResolver(async () => new Response("upstream error", { status: 503 }));
  assert.equal((await resolver({ street: "170 Ashland Pl", area: "11217" })).status, "unavailable");
  assert.equal(addressMatches({ features: "bad" }, { street: "170 Ashland Pl", area: "Brooklyn" }).status, "unavailable");
});

function filing(period: number, submitted: string, infested: unknown, total: unknown): CityRow {
  return {
    bin: a.bin, bbl: a.bbl, building_id: "805341",
    filing_period_start_date: window.bedbugs[period].start,
    filling_period_end_date: window.bedbugs[period].end,
    filing_date: submitted,
    infested_dwelling_unit_count: infested,
    of_dwelling_units: total,
  };
}

test("closed cycles distinguish late replacements, explicit zero, no filing, and same-day conflicts", () => {
  const latest = filing(0, "2026-03-04", "0", "54");
  const prior = filing(0, "2025-12-09", "9", "80");
  const selected = selectFilings([
    latest, { ...latest }, prior, filing(1, "2024-12-09", "1", "54"), filing(1, "2024-12-09", "2", "54"),
  ], window.bedbugs);
  assert.deepEqual(selected[0], { status: "filed", period: window.bedbugs[0], filedOn: "2026-03-04", infested: 0, total: 54 });
  assert.equal(selected[1].status, "unavailable");
  assert.equal(selected[2].status, "no-filing");
  assert.deepEqual(selectFilings([filing(0, "2025-12-09", "2", "unknown")], window.bedbugs)[0],
    { period: window.bedbugs[0], status: "filed", infested: 2, total: null, filedOn: "2025-12-09" });
  assert.equal(selectFilings([{ ...latest, filling_period_end_date: null }], window.bedbugs)[0].status, "unavailable");
});

test("HPD rejects a neighbor BIN, different lot, malformed aggregate, or incomplete bedbug result", async () => {
  const group = { bin: a.bin, bbl: a.bbl, buildingid: "805341", class: "B", n: "2" };
  await assert.rejects(readViolations(async () => [{ ...group, bin: "1082769" }], a), /conflicting/);
  await assert.rejects(readViolations(async () => [{ ...group, bbl: "1009720002" }], a), /conflicting/);
  await assert.rejects(readViolations(async () => [{ ...group, n: "ten" }], a), /invalid violation count/);
  await assert.rejects(readBedbugs(async () => Array(160).fill(filing(0, "2025-12-08", "1", "54")), a, window.bedbugs), /incomplete/);
  assert.deepEqual((await readViolations(async () => [], a)).value, {
    B: { count: 0, examples: [] }, C: { count: 0, examples: [] },
  });
  const grouped = [group, { ...group, bbl: null, buildingid: null }];
  const deduped = await readViolations(async (_, query) => query.group === "bin,class"
    ? [{ bin: a.bin, n: "3", class: "B" }] : query.group ? grouped : [], a);
  assert.equal(deduped.value.B.count, 3);
});

test("report preserves per-slot results and independent data through outages and validates scopes", async () => {
  const calls: { dataset: string; select: string; where: string }[] = [];
  let failedHeat = true;
  const reports = createReportService({
    resolve: async (input): Promise<Resolution> => input.street === a.street
      ? { status: "confirmed", address: a }
      : { status: "choose", message: "Choose your address", candidates: [{ key: "candidate", label: "Candidate" }] },
    query: async (dataset, query) => {
      calls.push({ dataset, ...query });
      if (dataset === "wvxf-dwi5") return [];
      if (dataset === "wz6d-d3jb") return [filing(0, "2025-12-09", "0", "54")];
      if (query.where.includes("HEAT/HOT WATER") && failedHeat) throw new CityDataError("City source timed out.");
      return [{ n: "7" }];
    },
    clock: () => now,
  });
  const addresses = [{ slot: "a", input: { street: a.street } }, { slot: "b", input: { street: "100 Broadway" } }] as const;
  const initial = await reports([...addresses]);
  assert.equal(initial.window.asOf, "2026-11-20");
  assert.equal(initial.results[1].status, "choose");
  const first = initial.results[0];
  assert.equal(first.status, "confirmed");
  if (first.status !== "confirmed") return;
  assert.equal(first.report.heat.status, "unavailable");
  assert.equal(first.report.noise.status, "available");
  assert.match(calls.find(({ where }) => where.includes("HEAT/HOT WATER"))!.where, /upper\(incident_address\).*1 STUYVESANT OVAL.*upper\(borough\) = 'MANHATTAN'.*>= '2025-11-20T00:00:00'.*< '2026-11-20T00:00:00'/);
  assert.match(calls.find(({ where }) => where.includes("'NOISE%'"))!.where, />= '2026-08-22T00:00:00'.*within_circle\(location,40\.73001,-73\.97863,300\)/);
  assert.match(calls.find(({ dataset }) => dataset === "82zj-84is")!.select, /count\(distinct globalid\)/);
  assert.match(calls.find(({ dataset }) => dataset === "wvxf-dwi5")!.where, /bin = '1082881'.*violationstatus = 'Open'/);
  assert.equal(calls.filter(({ select }) => select.includes("filling_period_end_date")).length, 1);

  failedHeat = false;
  const beforeRetry = calls.length;
  const retried = (await reports([{ ...addresses[0] }])).results[0];
  assert.equal(calls.length, beforeRetry + 1);
  assert.equal(retried.status === "confirmed" && retried.report.heat.status, "available");
});

test("missing BIN is scoped to HPD, while contradictory HPD results are unavailable", async () => {
  const base = {
    query: async (dataset: string) => {
      if (dataset === "wvxf-dwi5") return [{ bin: a.bin, bbl: a.bbl, buildingid: "10", class: "C", n: "2" }];
      if (dataset === "wz6d-d3jb") return [filing(0, "2025-12-19", "0", "54")];
      return [{ n: "0" }];
    },
    clock: () => now,
  };
  for (const address of [a, { ...a, bin: undefined }]) {
    const reports = createReportService({ ...base, resolve: async () => ({ status: "confirmed", address }) });
    const first = (await reports([{ slot: "research", input: { street: address.street } }])).results[0];
    assert.equal(first.status, "confirmed");
    if (first.status !== "confirmed") return;
    assert.equal(first.report.violations.status, "unavailable");
    assert.equal(first.report.bedbugs.status, "unavailable");
    assert.equal(first.report.noise.status === "available" && first.report.noise.value, 0);
  }
});

test("Socrata validates the response envelope and sends the optional token only in the header", async () => {
  const query = createSocrataClient(async (request, options) => {
    const url = new URL(String(request));
    assert.equal(url.searchParams.get("$limit"), "1");
    assert.equal(url.search.includes("fixture-token"), false);
    assert.equal(new Headers(options?.headers).get("X-App-Token"), "fixture-token");
    return Response.json({ row: "wrong shape" });
  }, "fixture-token");
  await assert.rejects(query("fake-id", { select: "count(*)", where: "true", limit: 1 }), /unexpected format/);
});

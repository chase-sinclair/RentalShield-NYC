import { streetQueryVariants, verifiedBbl, verifiedBin } from "./address";
import { sources, type ApartmentAddress, type BedbugFiling, type DateWindow, type ViolationCount } from "./contracts";
import { aggregateCount, CityDataError, literal, recordDate, requireComplete, rowCount, whereWindow, type CityRow, type SocrataClient } from "./socrata";

export const missingBinReason = "Building identifier unavailable.";
export const identityConflictReason = "City records returned conflicting building or lot identifiers.";
const violationLimit = 64;
const filingLimit = 160;

function validateBuildingRows(rows: CityRow[], address: ApartmentAddress, idKey: "buildingid" | "building_id") {
  if (!address.bin) throw new CityDataError(missingBinReason);
  if (address.identityConflict) throw new CityDataError(identityConflictReason);
  let bbl = address.bbl;
  let hpdBuildingId: string | undefined;
  for (const row of rows) {
    if (verifiedBin(row.bin) !== address.bin) throw new CityDataError(identityConflictReason);
    if (row.bbl != null && row.bbl !== "") {
      const actual = verifiedBbl(row.bbl);
      if (!actual || (bbl && actual !== bbl)) throw new CityDataError(identityConflictReason);
      bbl = actual;
    }
    if (row[idKey] != null && row[idKey] !== "") {
      const actual = String(row[idKey]);
      if (!/^\d+$/.test(actual) || (hpdBuildingId && actual !== hpdBuildingId)) {
        throw new CityDataError(identityConflictReason);
      }
      hpdBuildingId = actual;
    }
  }
  return { bin: address.bin, bbl, hpdBuildingId };
}

function violationClass(row: CityRow) {
  if (row.class !== "B" && row.class !== "C") {
    throw new CityDataError("HPD returned a violation class outside the requested scope.");
  }
  return row.class;
}

export async function readViolations(query: SocrataClient, address: ApartmentAddress) {
  if (!address.bin) throw new CityDataError(missingBinReason);
  if (address.identityConflict) throw new CityDataError(identityConflictReason);
  const dataset = sources.violations.dataset;
  const where = `bin = ${literal(address.bin)} AND violationstatus = 'Open' AND class IN ('B','C')`;
  const group = "bin,bbl,buildingid,class";
  const [groups, examples] = await Promise.all([
    query(dataset, { select: group + ",count(distinct violationid) as n", where, group, limit: violationLimit }),
    query(dataset, {
      select: "bin,bbl,buildingid,class,novdescription,novissueddate",
      where, order: "novissueddate DESC,violationid DESC", limit: 8,
    }).catch(() => []),
  ]);
  requireComplete(groups, violationLimit);
  const building = validateBuildingRows([...groups, ...examples], address, "buildingid");
  const multipleGroups = new Set(groups.map(violationClass)).size < groups.length;
  // If a class spans multiple identity groups, ask for a single distinct count across them.
  const counts = multipleGroups
    ? requireComplete(await query(dataset, { select: "bin,class,count(distinct violationid) as n", where, group: "bin,class", limit: 3 }), 3)
    : groups;
  if (multipleGroups) validateBuildingRows(counts, address, "buildingid");

  const value: Record<"B" | "C", ViolationCount> = {
    B: { count: 0, examples: [] },
    C: { count: 0, examples: [] },
  };
  for (const row of counts) {
    const key = violationClass(row);
    const count = rowCount(row.n);
    if (count === null) throw new CityDataError("HPD returned an invalid violation count.");
    value[key].count = count;
  }
  if (examples.length && !groups.length) throw new CityDataError("HPD returned inconsistent violation results. Try again.");
  for (const row of examples) {
    const description = typeof row.novdescription === "string" ? row.novdescription.slice(0, 400) : undefined;
    const noticeDate = recordDate(row.novissueddate);
    if (description || noticeDate) value[violationClass(row)].examples.push({ description, noticeDate });
  }
  return { value, building };
}

function filingSignature(row: CityRow) {
  return JSON.stringify([
    rowCount(row.infested_dwelling_unit_count), rowCount(row.of_dwelling_units),
    rowCount(row.eradicated_unit_count), rowCount(row.re_infested_dwelling_unit),
  ]);
}

export function selectFilings(rows: CityRow[], periods: DateWindow[]): BedbugFiling[] {
  return periods.map((period) => {
    const filings = rows.filter((row) => recordDate(row.filing_period_start_date) === period.start);
    if (!filings.length) return { period, status: "no-filing" };
    if (filings.some((row) => recordDate(row.filling_period_end_date) !== period.end || !recordDate(row.filing_date))) {
      return { period, status: "unavailable", reason: "HPD returned a missing or conflicting filing date or period." };
    }

    const latest = filings.map((row) => recordDate(row.filing_date)!).sort().at(-1)!;
    const sameDay = filings.filter((row) => recordDate(row.filing_date) === latest);
    if (new Set(sameDay.map(filingSignature)).size > 1) {
      return { period, status: "unavailable", reason: "The latest owner filings have conflicting counts on the same date." };
    }
    const selected = sameDay[0];
    return {
      period, status: "filed", filedOn: latest,
      infested: rowCount(selected.infested_dwelling_unit_count), total: rowCount(selected.of_dwelling_units),
    };
  });
}

export async function readBedbugs(query: SocrataClient, address: ApartmentAddress, periods: DateWindow[]) {
  if (!address.bin) throw new CityDataError(missingBinReason);
  if (address.identityConflict) throw new CityDataError(identityConflictReason);
  const starts = periods.map((period) => literal(period.start + "T00:00:00")).join(",");
  const rows = requireComplete(await query(sources.bedbugs.dataset, {
    select: "bin,bbl,building_id,filing_period_start_date,filling_period_end_date,filing_date,infested_dwelling_unit_count,of_dwelling_units,eradicated_unit_count,re_infested_dwelling_unit",
    where: `bin = ${literal(address.bin)} AND filing_period_start_date IN (${starts})`,
    order: "filing_period_start_date DESC,filing_date DESC",
    limit: filingLimit,
  }), filingLimit);
  const building = validateBuildingRows(rows, address, "building_id");
  if (rows.some((row) => !periods.some((period) => recordDate(row.filing_period_start_date) === period.start))) {
    throw new CityDataError("HPD returned a filing outside the requested reporting cycles.");
  }
  return { value: selectFilings(rows, periods), building };
}

export async function readHeat(query: SocrataClient, address: ApartmentAddress, period: DateWindow) {
  const streets = streetQueryVariants(address.street).map(literal).join(",");
  if (!streets) throw new CityDataError("The confirmed street address could not be matched to 311 requests.");
  const filters = [
    `upper(incident_address) IN (${streets})`,
    `upper(borough) = ${literal(address.borough.toUpperCase())}`,
    "upper(complaint_type) = 'HEAT/HOT WATER'",
    whereWindow(period),
  ];
  if (address.zip) filters.push(`(incident_zip IS NULL OR incident_zip = '' OR incident_zip = ${literal(address.zip)})`);
  if (address.bbl && !address.identityConflict) {
    filters.push(`(bbl IS NULL OR bbl = '' OR bbl = ${literal(address.bbl)})`);
  }
  const value = aggregateCount(await query(sources.heat.dataset, {
    select: "count(distinct unique_key) as n",
    where: filters.join(" AND "),
    limit: 1,
  }));
  return { value };
}

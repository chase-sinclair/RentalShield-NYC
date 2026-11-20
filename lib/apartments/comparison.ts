import { isMorning } from "./calendar";
import {
  destinationLabels,
  maxRentCents,
  routeOriginKey,
  type Apartment,
  type BedbugFiling,
  type DateWindow,
  type Destination,
  type Evidence,
  type RouteAssumptions,
  type RouteResult,
} from "./contracts";

const dollars = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});
const numbers = new Intl.NumberFormat("en-US");

export const formatRent = (cents: number) => dollars.format(cents / 100);
export const formatCount = (count: number) => numbers.format(count);

export function parseRent(value: string) {
  const text = value.trim();
  if (!text) return undefined;
  const match = /^\$?(?:(\d+|\d{1,3}(?:,\d{3})+)(?:\.(\d{1,2}))?|\.(\d{1,2}))$/.exec(text);
  if (!match) return NaN;
  const cents = Number((match[1] ?? "0").replaceAll(",", "") + (match[2] ?? match[3] ?? "").padEnd(2, "0"));
  return Number.isSafeInteger(cents) && cents <= maxRentCents ? cents : NaN;
}

export function formatDuration(seconds: number) {
  if (seconds > 0 && seconds < 60) return "under 1 minute";
  const minutes = Math.round(seconds / 60);
  return `${formatCount(minutes)} ${minutes === 1 ? "minute" : "minutes"}`;
}

export function sameWindow(a?: DateWindow, b?: DateWindow) {
  return a?.start === b?.start && a?.end === b?.end;
}

export function comparableEvidence(
  a: Apartment | undefined, b: Apartment | undefined,
  first?: Evidence<unknown>, second?: Evidence<unknown>,
) {
  if (!a || !b || a.report.provenance !== b.report.provenance ||
    first?.status !== "available" || second?.status !== "available") return false;

  const x = first.scope;
  const y = second.scope;
  return x.source === y.source && x.scope === y.scope && x.referenceDate === y.referenceDate &&
    x.radiusMeters === y.radiusMeters && sameWindow(x.window, y.window);
}

export function countDifference(a?: number | null, b?: number | null) {
  return a == null || b == null ? undefined : b - a;
}

export function countWording(value: number, single: string, plural: string) {
  const count = Math.abs(value);
  return `${formatCount(count)} ${value > 0 ? "more" : "fewer"} ${count === 1 ? single : plural}`;
}

export function sameRouteAssumptions(a: RouteAssumptions, b: RouteAssumptions) {
  return a.mode === b.mode && a.departure === b.departure;
}

export function findRoute(
  apartment: Apartment | undefined,
  destination: Destination,
  assumptions: RouteAssumptions,
  results: RouteResult[],
) {
  if (!apartment) return undefined;
  return results.find((result) =>
    result.originKey === routeOriginKey(apartment.report.address) && result.provenance === apartment.report.provenance &&
    result.destination.id === destination.id && result.destination.address === destination.address &&
    sameRouteAssumptions(result.assumptions, assumptions));
}

export function compareRoutes(first: RouteResult | undefined, second: RouteResult | undefined, workdays: number) {
  if (first?.status !== "available" || second?.status !== "available" ||
    first.provenance !== second.provenance || first.destination.id !== second.destination.id ||
    first.destination.address !== second.destination.address ||
    !sameRouteAssumptions(first.assumptions, second.assumptions)) return undefined;

  const oneWaySeconds = second.seconds - first.seconds;
  return {
    oneWaySeconds,
    weeklySeconds: oneWaySeconds * workdays,
    morning: first.assumptions.mode === "transit" && isMorning(first.assumptions.departure),
  };
}

export function selectedPeriod(evidence: Evidence<BedbugFiling[]> | undefined, period: DateWindow) {
  return evidence?.status === "available"
    ? evidence.value.find((filing) => sameWindow(filing.period, period))
    : undefined;
}

type SummaryCategory = "rent" | "commute" | "building";
type SummaryLine = { category: SummaryCategory; text: string };

export function summarize(
  a: Apartment | undefined, b: Apartment | undefined,
  work: Destination | undefined, assumptions: RouteAssumptions, results: RouteResult[], workdays: number,
): SummaryLine[] {
  const sameProvenance = a && b && a.report.provenance === b.report.provenance;
  const rent = sameProvenance ? countDifference(a.askingRentCents, b.askingRentCents) : undefined;
  const first = work && findRoute(a, work, assumptions, results);
  const second = work && findRoute(b, work, assumptions, results);
  const commute = compareRoutes(first, second, workdays);
  const classC = metricDifference(a, b, "C");
  const classB = metricDifference(a, b, "B");
  const heat = metricDifference(a, b, "heat");
  const mostRelevant = [
    { value: classC, one: "open Class C violation", many: "open Class C violations" },
    { value: classB, one: "open Class B violation", many: "open Class B violations" },
    { value: heat, one: "heat or hot-water report", many: "heat or hot-water reports" },
  ].find(({ value }) => value !== undefined && value !== 0);

  const rentDirection = rent !== undefined && rent < 0 ? "less" : "more";
  const rentText = rent === undefined ? "Enter both asking rents to compare monthly and annual costs."
    : rent === 0 ? "Both apartments have the same asking rent."
      : `Apartment B costs ${formatRent(Math.abs(rent))} ${rentDirection} per month (${formatRent(Math.abs(rent) * 12)} ${rentDirection} over 12 months at the asking rent).`;

  let commuteText = "Add a Work destination and calculate both routes to compare one-way travel.";
  if (commute && first?.status === "available" && second?.status === "available") {
    const duration = `Work by ${assumptions.mode}: ${formatDuration(first.seconds)} one way from A, ${formatDuration(second.seconds)} from B.`;
    const difference = formatDuration(Math.abs(commute.oneWaySeconds));
    const weekly = formatDuration(Math.abs(commute.weeklySeconds));
    const when = commute.morning ? " each morning" : " one way";
    const time = `${difference}${when} and ${weekly} over ${workdays} ${workdays === 1 ? "workday" : "workdays"}`;
    const result = commute.oneWaySeconds === 0 ? "Both estimates are equal."
      : commute.oneWaySeconds < 0 ? `B saves ${time}.` : `B takes ${time} longer.`;
    commuteText = `${duration} ${result}`;
  } else if (work && (first?.status === "available" || second?.status === "available")) {
    const available = first?.status === "available" ? first : second;
    if (available?.status === "available") {
      commuteText = `Work is ${formatDuration(available.seconds)} one way from ${available === first ? "A" : "B"}. Calculate the other route to compare.`;
    }
  } else if (work && (first || second)) {
    commuteText = "Two available Work estimates are needed to compare travel times.";
  }

  const buildingText = mostRelevant?.value !== undefined
    ? `Apartment B has ${countWording(mostRelevant.value, mostRelevant.one, mostRelevant.many)}.`
    : [classC, classB, heat].includes(0)
      ? "The available open violation or heat report counts are tied."
      : "Verified building records for both apartments are needed to compare housing conditions.";

  return [
    { category: "rent", text: rentText },
    { category: "commute", text: commuteText },
    { category: "building", text: buildingText },
  ];
}

export function metricDifference(
  a: Apartment | undefined, b: Apartment | undefined,
  metric: "B" | "C" | "heat" | "noise" | "trees",
) {
  if (metric === "B" || metric === "C") {
    const first = a?.report.violations;
    const second = b?.report.violations;
    if (first?.status !== "available" || second?.status !== "available" ||
      !comparableEvidence(a, b, first, second)) return undefined;
    return second.value[metric].count - first.value[metric].count;
  }

  const first = a?.report[metric];
  const second = b?.report[metric];
  return first?.status === "available" && second?.status === "available" && comparableEvidence(a, b, first, second)
    ? second.value - first.value
    : undefined;
}

export function tourQuestions(a?: Apartment, b?: Apartment) {
  const items = ([["A", a], ["B", b]] as const).flatMap(([slot, apartment]) => {
    if (!apartment) return [];
    const { violations, bedbugs, heat } = apartment.report;
    const periods = bedbugs.status === "available" ? bedbugs.value : [];
    const latest = periods[0];
    return [
      violations.status === "available" && violations.value.C.count > 0
        ? { slot, priority: 0, evidence: "class-c", text: "What has been repaired, and can I see repair documentation?" }
        : null,
      latest?.status === "filed" && (latest.infested ?? 0) > 0
        ? { slot, priority: 1, evidence: "bedbugs", text: "What treatment and follow-up were completed?" }
        : null,
      heat.status === "available" && heat.value >= 2
        ? { slot, priority: 2, evidence: "heat", text: "How are outages handled in this building?" }
        : null,
      latest?.status === "no-filing" && periods.slice(1).some((period) => period.status === "filed")
        ? { slot, priority: 3, evidence: "bedbugs", text: "Can I see the latest annual filing?" }
        : null,
    ];
  });
  return items.filter((item) => item !== null).sort((x, y) => x.priority - y.priority).slice(0, 3);
}

export function routeMetricTitle(id: Destination["id"], assumptions: RouteAssumptions) {
  if (id === "work") return isMorning(assumptions.departure) ? "One-way morning commute" : "One-way work commute";
  return `One-way to ${destinationLabels[id]}`;
}

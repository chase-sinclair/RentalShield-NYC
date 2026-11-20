import { reportingWindow } from "./calendar";
import type {
  Apartment, ApartmentAddress, BedbugFiling, Destination, Evidence, RouteAssumptions, RouteResult, Source,
} from "./contracts";

export const demoDate = "2026-05-04T12:30:00.000Z";
const retrievedAt = "2026-05-03T16:00:00.000Z";
const window = reportingWindow(new Date(retrievedAt));
export const demoWork: Destination = { id: "work", address: "8 Paper Mill Square, New York, NY" };

function sampleEvidence<T>(source: Source, value: T): Evidence<T> {
  const kind = source === "noise" || source === "trees" ? "nearby" : source === "heat" ? "address" : "building";
  return {
    status: "available",
    value,
    scope: {
      source,
      scope: kind,
      referenceDate: window.asOf,
      window: source === "noise" ? window.noise : source === "heat" ? window.heat : undefined,
      radiusMeters: kind === "nearby" ? window.radiusMeters : undefined,
      retrievedAt,
    },
  };
}

function sampleApartment(
  id: string, street: string, borough: ApartmentAddress["borough"], askingRentCents: number,
  counts: { classB: number; classC: number; heat: number; noise: number; trees: number },
  filings: BedbugFiling[],
): Apartment {
  return {
    askingRentCents,
    report: {
      provenance: "demo",
      address: { key: id, street, borough, latitude: 0, longitude: 0 },
      window,
      violations: sampleEvidence("violations", {
        B: { count: counts.classB, examples: [] },
        C: { count: counts.classC, examples: [] },
      }),
      heat: sampleEvidence("heat", counts.heat),
      bedbugs: sampleEvidence("bedbugs", filings),
      noise: sampleEvidence("noise", counts.noise),
      trees: sampleEvidence("trees", counts.trees),
    },
  };
}

export const demoApartments = [
  sampleApartment("sample-a", "18 Lantern Row", "Brooklyn", 265000,
    { classB: 2, classC: 1, heat: 3, noise: 25, trees: 84 },
    [
      { period: window.bedbugs[0], status: "filed", filedOn: "2025-12-08", infested: 0, total: 54 },
      { period: window.bedbugs[1], status: "filed", filedOn: "2024-12-10", infested: 1, total: 54 },
      { period: window.bedbugs[2], status: "filed", filedOn: "2023-12-19", infested: 0, total: 54 },
    ]),
  sampleApartment("sample-b", "42 Juniper Walk", "Queens", 280000,
    { classB: 1, classC: 0, heat: 1, noise: 40, trees: 29 },
    [
      { period: window.bedbugs[0], status: "no-filing" },
      { period: window.bedbugs[1], status: "filed", filedOn: "2024-12-13", infested: 0, total: 42 },
      { period: window.bedbugs[2], status: "filed", filedOn: "2023-12-15", infested: 0, total: 42 },
    ]),
] as const;

export function demoRoutes(assumptions: RouteAssumptions): RouteResult[] {
  const walking = assumptions.mode === "walking";
  const minutes = walking ? [82, 66] : [41, 29];
  return demoApartments.map(({ report }, index) => ({
    provenance: "demo",
    status: "available",
    originKey: report.address.key,
    destination: demoWork,
    assumptions,
    seconds: minutes[index] * 60,
    lines: walking ? undefined : [index === 0 ? "Walk · Sample Metro · Walk" : "Walk · Sample Express · Walk"],
  }));
}

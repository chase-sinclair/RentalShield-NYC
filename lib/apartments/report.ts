import { addressInputSchema, resolveAddress } from "./address";
import { publicCache } from "./cache";
import { nyDate, reportingWindow } from "./calendar";
import type {
  AddressInput, AddressReport, ApartmentAddress, Evidence, EvidenceScope, ReportResponse, ReportSlot,
  ReportingWindow, Resolution, Slot, Source,
} from "./contracts";
import { identityConflictReason, readBedbugs, readHeat, readViolations } from "./housing";
import { readNoise, readTrees } from "./neighborhood";
import { CityDataError, createSocrataClient, type SocrataClient } from "./socrata";

const measurementTtl = 6 * 60 * 60 * 1000;
type Reading<T> = { value: T; building?: EvidenceScope["building"] };

function meter<T>(
  source: Source,
  scope: EvidenceScope["scope"],
  query: SocrataClient,
  clock: () => Date,
  measure: (query: SocrataClient, address: ApartmentAddress, window: ReportingWindow) => Promise<Reading<T>>,
) {
  const cache = publicCache<Evidence<T>>(measurementTtl, 256);
  return (address: ApartmentAddress, window: ReportingWindow) => {
    const definition: EvidenceScope = {
      source, scope, referenceDate: window.asOf,
      window: source === "heat" ? window.heat : source === "noise" ? window.noise : undefined,
      radiusMeters: scope === "nearby" ? window.radiusMeters : undefined,
    };
    const identity = scope === "building"
      ? [address.bin, address.bbl, address.identityConflict]
      : scope === "address"
        ? [address.street, address.borough, address.zip, address.bbl, address.identityConflict]
        : [address.latitude, address.longitude];
    // A BIN-scoped read is shared by listings in the same building.
    const key = JSON.stringify(["nyc-v1", source, identity, window]);

    return cache(key, async () => {
      try {
        const { value, building } = await measure(query, address, window);
        const now = clock();
        const referenceDate = source === "violations" || source === "trees" ? nyDate(now) : window.asOf;
        return {
          status: "available", value,
          scope: { ...definition, referenceDate, retrievedAt: now.toISOString(), building },
        };
      } catch (error) {
        const reason = error instanceof CityDataError ? error.message : "Public records are temporarily unavailable. Try again.";
        return { status: "unavailable", reason, scope: definition };
      }
    }, (evidence) => evidence.status === "available" &&
      !(source === "bedbugs" && Array.isArray(evidence.value) && evidence.value.some((period) => period.status === "unavailable")));
  };
}

interface ReportServiceOptions {
  resolve: (input: AddressInput) => Promise<Resolution>;
  query: SocrataClient;
  clock?: () => Date;
}

export function createReportService({ resolve, query, clock = () => new Date() }: ReportServiceOptions) {
  const violations = meter("violations", "building", query, clock, readViolations);
  const heat = meter("heat", "address", query, clock, (query, address, window) => readHeat(query, address, window.heat));
  const bedbugs = meter("bedbugs", "building", query, clock, (query, address, window) => readBedbugs(query, address, window.bedbugs));
  const noise = meter("noise", "nearby", query, clock, readNoise);
  const trees = meter("trees", "nearby", query, clock, readTrees);

  async function buildReport(address: ApartmentAddress, window: ReportingWindow): Promise<AddressReport> {
    const [open, hotWater, filings, noiseCount, treeCount] = await Promise.all([
      violations(address, window), heat(address, window), bedbugs(address, window),
      noise(address, window), trees(address, window),
    ]);
    const first = open.scope.building;
    const second = filings.scope.building;
    const identityConflict = Boolean(
      (first?.bbl && second?.bbl && first.bbl !== second.bbl) ||
      (first?.hpdBuildingId && second?.hpdBuildingId && first.hpdBuildingId !== second.hpdBuildingId),
    );
    const invalid = { status: "unavailable", reason: identityConflictReason } as const;
    return {
      address, window, provenance: "live", heat: hotWater, noise: noiseCount, trees: treeCount,
      violations: identityConflict ? { ...invalid, scope: open.scope } : open,
      bedbugs: identityConflict ? { ...invalid, scope: filings.scope } : filings,
    };
  }

  async function resolveSlot(entry: { slot: Slot; input?: unknown }, window: ReportingWindow): Promise<ReportSlot> {
    const { slot } = entry;
    const parsed = addressInputSchema.safeParse(entry.input);
    if (!parsed.success) return { slot, status: "invalid", message: "Enter a valid street address and borough or ZIP." };
    const resolution = await resolve(parsed.data);
    if (resolution.status !== "confirmed") return { slot, ...resolution };
    return { slot, status: "confirmed", report: await buildReport(resolution.address, window) };
  }

  return async function getReports(entries: { slot: Slot; input?: unknown }[]): Promise<ReportResponse> {
    const window = reportingWindow(clock());
    return { window, results: await Promise.all(entries.map((entry) => resolveSlot(entry, window))) };
  };
}

export const getReports = createReportService({
  resolve: resolveAddress,
  query: createSocrataClient(fetch, process.env.NYC_OPEN_DATA_APP_TOKEN),
});

export const boroughs = ["Manhattan", "Brooklyn", "Queens", "Bronx", "Staten Island"] as const;
export type Borough = (typeof boroughs)[number];

export const slots = ["research", "a", "b"] as const;
export type Slot = (typeof slots)[number];

export const destinationIds = ["work", "gym", "friends"] as const;
export type DestinationId = (typeof destinationIds)[number];
export const destinationLabels: Record<DestinationId, string> = {
  work: "Work",
  gym: "Gym",
  friends: "Friends",
};

export function isDestinationAddress(value: string) {
  const text = value.trim();
  return /^\d[\w-]*(?:\s+\d+\/\d+)?\s+\S/.test(text) &&
    (/\b\d{5}(?:-\d{4})?$/.test(text) || /\s[A-Z]{2}\.?$/i.test(text) || text.split(",").filter((part) => part.trim()).length >= 3);
}

export type Provenance = "live" | "demo";

export interface DateWindow {
  start: string;
  end: string;
}

export interface ReportingWindow {
  asOf: string;
  heat: DateWindow;
  noise: DateWindow;
  bedbugs: DateWindow[];
  radiusMeters: number;
}

export interface AddressInput {
  street: string;
  area?: string;
  selection?: string;
}

export interface ApartmentAddress {
  key: string;
  street: string;
  borough: Borough;
  zip?: string;
  latitude: number;
  longitude: number;
  bin?: string;
  bbl?: string;
  identityConflict?: true;
}

export function addressLabel(address: ApartmentAddress) {
  return [address.street, address.borough, address.zip].filter(Boolean).join(", ");
}

export function confirmedInput(address: ApartmentAddress): AddressInput {
  return { street: address.street, area: address.zip ?? address.borough, selection: address.key };
}

export function routeOriginKey(address: ApartmentAddress) {
  return [address.key, address.latitude, address.longitude].join("|");
}

export interface AddressCandidate {
  key: string;
  label: string;
  bin?: string;
}

export type Resolution =
  | { status: "confirmed"; address: ApartmentAddress }
  | { status: "choose"; candidates: AddressCandidate[]; message: string }
  | { status: "invalid" | "unmatched" | "unavailable"; message: string };

export const sources = {
  violations: {
    name: "HPD Housing Maintenance Code Violations",
    url: "https://data.cityofnewyork.us/Housing-Development/Housing-Maintenance-Code-Violations/wvxf-dwi5",
    dataset: "wvxf-dwi5",
    definition: "Open hazardous (Class B) and immediately hazardous (Class C) violations for this building.",
  },
  heat: {
    name: "NYC 311 Service Requests",
    url: "https://data.cityofnewyork.us/Social-Services/311-Service-Requests-from-2020-to-Present/erm2-nwe9",
    dataset: "erm2-nwe9",
    definition: "Heat and hot-water service requests at the matched street address.",
  },
  bedbugs: {
    name: "HPD Bedbug Reporting",
    url: "https://data.cityofnewyork.us/Housing-Development/Bedbug-Reporting/wz6d-d3jb",
    dataset: "wz6d-d3jb",
    definition: "Annual building-level counts reported by the owner.",
  },
  noise: {
    name: "NYC 311 Service Requests",
    url: "https://data.cityofnewyork.us/Social-Services/311-Service-Requests-from-2020-to-Present/erm2-nwe9",
    dataset: "erm2-nwe9",
    definition: "Nearby 311 service requests classified as noise.",
  },
  trees: {
    name: "NYC Parks Forestry Planting Spaces",
    url: "https://data.cityofnewyork.us/Environment/Forestry-Planting-Spaces/82zj-84is",
    dataset: "82zj-84is",
    definition: "Populated street tree sites in the Parks inventory.",
  },
} as const;
export type Source = keyof typeof sources;

export const rentHistoryUrl = "https://portal.hcr.ny.gov/app/ask";

export interface EvidenceScope {
  source: Source;
  scope: "building" | "address" | "nearby";
  referenceDate: string;
  window?: DateWindow;
  radiusMeters?: number;
  retrievedAt?: string;
  publishedAt?: string;
  building?: { bin: string; bbl?: string; hpdBuildingId?: string };
}

export type EvidenceStatus<T> =
  | { status: "available"; value: T }
  | { status: "unavailable"; reason: string };
export type Evidence<T> = EvidenceStatus<T> & { scope: EvidenceScope };

export interface ViolationCount {
  count: number;
  examples: { description?: string; noticeDate?: string }[];
}

export type BedbugFiling = { period: DateWindow } & (
  | { status: "filed"; filedOn: string; infested: number | null; total: number | null }
  | { status: "no-filing" }
  | { status: "unavailable"; reason: string }
);

export interface AddressReport {
  provenance: Provenance;
  address: ApartmentAddress;
  window: ReportingWindow;
  violations: Evidence<Record<"B" | "C", ViolationCount>>;
  heat: Evidence<number>;
  bedbugs: Evidence<BedbugFiling[]>;
  noise: Evidence<number>;
  trees: Evidence<number>;
}

export interface ReportRequest {
  addresses: { slot: Slot; input: AddressInput }[];
}

export type ReportSlot = { slot: Slot } & (
  | { status: "confirmed"; report: AddressReport }
  | Exclude<Resolution, { status: "confirmed" }>
);

export interface ReportResponse {
  window: ReportingWindow;
  results: ReportSlot[];
}

export interface Apartment {
  report: AddressReport;
  askingRentCents?: number;
}

export interface Destination {
  id: DestinationId;
  address: string;
}

export type TravelMode = "transit" | "walking";
export interface RouteAssumptions {
  mode: TravelMode;
  departure?: string;
}

export type RouteFailure = "disabled" | "no-route" | "throttled" | "timeout" | "unavailable" | "invalid-origin";

export type RouteResult = {
  originKey: string;
  destination: Destination;
  assumptions: RouteAssumptions;
  provenance: Provenance;
  retrievedAt?: string;
} & (
  | { status: "available"; seconds: number; distanceMeters?: number; lines?: string[] }
  | { status: RouteFailure; reason: string }
);

export interface CommuteResponse {
  overall: "complete" | "disabled" | "throttled";
  assumptions: RouteAssumptions;
  results: RouteResult[];
}

export const maxRentCents = Math.floor(Number.MAX_SAFE_INTEGER / 12);

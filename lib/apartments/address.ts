import { z } from "zod";

import { publicCache } from "./cache";
import { addressLabel, boroughs, type AddressInput, type ApartmentAddress, type Borough, type Resolution } from "./contracts";

const suffixNames: Record<string, string[]> = {
  STREET: ["ST", "STR"], AVENUE: ["AVE", "AV"], BOULEVARD: ["BLVD", "BL"],
  DRIVE: ["DR"], ROAD: ["RD"], PLACE: ["PL"], TERRACE: ["TER", "TERR"],
  COURT: ["CT"], LANE: ["LN"], PARKWAY: ["PKWY", "PKY"], CIRCLE: ["CIR"], SQUARE: ["SQ"],
};
const directionNames: Record<string, string> = { E: "EAST", W: "WEST", N: "NORTH", S: "SOUTH" };
const availabilityMessage = "NYC address lookup is temporarily unavailable. Try again.";
const unmatchedMessage = "Check the house number and street, or add the borough or ZIP.";

const featureSchema = z.object({
  geometry: z.object({ type: z.literal("Point"), coordinates: z.tuple([z.number().finite(), z.number().finite()]) }),
  properties: z.object({
    gid: z.string().optional(),
    housenumber: z.string(),
    street: z.string(),
    borough: z.enum(boroughs),
    postalcode: z.string().regex(/^\d{5}$/).optional(),
    addendum: z.object({ pad: z.object({ bin: z.unknown(), bbl: z.unknown() }).optional() }).optional(),
  }),
});
const responseSchema = z.object({ type: z.literal("FeatureCollection"), features: z.array(z.unknown()) });
const looseFeatureSchema = z.object({ properties: z.record(z.unknown()) });
const boroughCodes: Record<Borough, string> = { Manhattan: "1", Bronx: "2", Brooklyn: "3", Queens: "4", "Staten Island": "5" };
const addressCacheMs = 24 * 60 * 60 * 1000;

export const addressInputSchema = z.object({
  street: z.string().trim().min(1).max(160),
  area: z.string().trim().max(40).optional(),
  selection: z.string().min(1).max(420).optional(),
});

function splitAroundUnit(address: string): [string, string] {
  const text = address.trim();
  const unit = /(?:^|\s*,\s*|\s+)(?:(?:APT\.?|APARTMENT|UNIT|SUITE|STE\.?|FLOOR|FL\.?)(?=\s|#)\s*#?\s*|#\s*)[\w-]+/i.exec(text);
  if (!unit) return [text, ""];
  return [text.slice(0, unit.index).trim(), text.slice(unit.index + unit[0].length).trim()];
}

function normalizedText(value: string) {
  return value.normalize("NFKC").replace(/[‐‑–—]/g, "-").replace(/[.‘’']/g, "")
    .replace(/\s+/g, " ").trim().toUpperCase();
}

export function normalizeStreet(street: string) {
  const text = normalizedText(street).replace(/\b(?:BWAY|BWY|B WAY)\b/g, "BROADWAY");
  if (text === "THE GRAND CONCOURSE") return "GRAND CONCOURSE";
  const parts = text.split(" ");
  if (parts.length > 1 && directionNames[parts[0]]) parts[0] = directionNames[parts[0]];
  const last = parts.at(-1)!;
  for (const [name, aliases] of Object.entries(suffixNames)) {
    if (parts.length > 1 && aliases.includes(last)) {
      parts[parts.length - 1] = name;
      break;
    }
  }
  return parts.join(" ");
}

function splitHouse(street: string) {
  const match = /^(\d+(?:-\d+)?[A-Z]?(?:\s+\d+\/\d+)?)\s+(.+)$/.exec(normalizedText(street));
  if (!match) return null;
  return { house: match[1], street: normalizeStreet(match[2]) };
}

function boroughFrom(text: string) {
  return boroughs.find((borough) => normalizedText(borough) === normalizedText(text).replace(/^THE BRONX$/, "BRONX"));
}

type AreaHints = { zip?: string; borough?: Borough };
const zipAtEnd = /(?:^|\s)(\d{5})(?:-\d{4})?$/;

function parseArea(text: string): AreaHints | null {
  const value = text.trim();
  const zip = zipAtEnd.exec(value);
  const borough = boroughFrom(value);
  if (zip?.index === 0) return { zip: zip[1] };
  return borough ? { borough } : null;
}

function pastedArea(text: string): AreaHints {
  const value = text
    .replace(/(?:^|\s+)(?:U\.?S(?:\.?A)?|United\s+States(?:\s+of\s+America)?)(?=[\s.!?;:]*$)/i, "")
    .replace(/[\s.!?;:]+$/, "");
  const zip = zipAtEnd.exec(value);
  const locality = (zip ? value.slice(0, zip.index) : value).replace(/\s+(?:N\.?Y\.?|New York)$/i, "");
  return { zip: zip?.[1], borough: boroughFrom(locality) };
}

function parseAddress(input: AddressInput) {
  const [first, ...rest] = input.street.split(",");
  const [street, localityAfterUnit] = splitAroundUnit(first);
  const houseStreet = splitHouse(street);
  const explicit = parseArea(input.area ?? "");
  if (input.area && !explicit) return { houseStreet, error: "Enter an NYC borough or a five-digit ZIP." };

  const localities = [localityAfterUnit, ...rest.flatMap(splitAroundUnit)];
  const area: AreaHints = {};
  for (const hint of [...localities.map(pastedArea), explicit]) {
    if (!hint) continue;
    if ((area.zip && hint.zip && area.zip !== hint.zip) || (area.borough && hint.borough && area.borough !== hint.borough)) {
      return { houseStreet, error: "The address contains conflicting borough or ZIP entries. Check the address and try again." };
    }
    area.zip ??= hint.zip;
    area.borough ??= hint.borough;
  }
  return { houseStreet, area: area.zip || area.borough ? area : undefined };
}

export function verifiedBin(value: unknown) {
  return typeof value === "string" && /^[1-5]\d{6}$/.test(value) && !/^[1-5]0{6}$/.test(value) ? value : undefined;
}

export function verifiedBbl(value: unknown) {
  return typeof value === "string" && /^[1-5]\d{9}$/.test(value) && Number(value.slice(1)) > 0 ? value : undefined;
}

export function insideNYCPoint(latitude: number, longitude: number) {
  return latitude >= 40.47 && latitude <= 40.93 && longitude >= -74.27 && longitude <= -73.68;
}

function titleCase(value: string) {
  return value.toLowerCase().replace(/\b[a-z]/g, (letter) => letter.toUpperCase());
}

function sameArea(address: ApartmentAddress, area?: AreaHints) {
  return (!area?.zip || area.zip === address.zip) && (!area?.borough || area.borough === address.borough);
}

export function addressMatches(payload: unknown, input: AddressInput): Resolution {
  const parsed = parseAddress(input);
  if (!parsed.houseStreet) return { status: "invalid", message: "Enter a house number and street name." };
  if (parsed.error) return { status: "invalid", message: parsed.error };
  const response = responseSchema.safeParse(payload);
  if (!response.success) return { status: "unavailable", message: availabilityMessage };

  const addresses: ApartmentAddress[] = [];
  let compatibleMalformed = false;
  for (const [index, feature] of response.data.features.entries()) {
    const candidate = featureSchema.safeParse(feature);
    if (!candidate.success) {
      const loose = looseFeatureSchema.safeParse(feature);
      const props = loose.success ? loose.data.properties : undefined;
      // Street and place features are expected, but a malformed matching address may compete.
      if (!props || (typeof props.housenumber === "string" && typeof props.street === "string" &&
        normalizedText(props.housenumber) === parsed.houseStreet.house && normalizeStreet(props.street) === parsed.houseStreet.street)) {
        compatibleMalformed = true;
      }
      continue;
    }

    const { properties, geometry } = candidate.data;
    const house = normalizedText(properties.housenumber);
    const street = normalizeStreet(properties.street);
    if (house !== parsed.houseStreet.house || street !== parsed.houseStreet.street) continue;

    const [longitude, latitude] = geometry.coordinates;
    if (!insideNYCPoint(latitude, longitude)) continue;
    const bin = verifiedBin(properties.addendum?.pad?.bin);
    const bbl = verifiedBbl(properties.addendum?.pad?.bbl);
    const key = bin
      ? [house, street, properties.borough, bin].join("|")
      : [house, street, properties.borough, properties.postalcode, latitude, longitude, properties.gid ?? index].join("|");
    const address: ApartmentAddress = {
      key,
      street: house + " " + titleCase(street),
      borough: properties.borough,
      zip: properties.postalcode,
      latitude,
      longitude,
      bin,
      bbl,
      identityConflict: (bin && !bin.startsWith(boroughCodes[properties.borough])) ||
        (bbl && !bbl.startsWith(boroughCodes[properties.borough])) ? true : undefined,
    };
    if (sameArea(address, parsed.area)) addresses.push(address);
  }

  const deduped: ApartmentAddress[] = [];
  for (const address of addresses) {
    const existing = address.bin && deduped.find((previous) => previous.bin === address.bin);
    if (!existing) {
      deduped.push(address);
    } else if (existing.bbl && address.bbl && existing.bbl !== address.bbl) {
      existing.identityConflict = true;
    } else if (!existing.bbl && address.bbl) {
      existing.bbl = address.bbl;
    }
  }

  const selected = input.selection && deduped.find((address) => address.key === input.selection);
  if (selected) return { status: "confirmed", address: selected };
  if (deduped.length === 1 && parsed.area && !input.selection && !compatibleMalformed) {
    return { status: "confirmed", address: deduped[0] };
  }
  if (!deduped.length) {
    if (compatibleMalformed) return { status: "unavailable", message: availabilityMessage };
    return {
      status: "unmatched",
      message: parsed.area?.borough && parsed.area.zip
        ? "Check that the borough and ZIP both match the street address."
        : unmatchedMessage,
    };
  }
  return {
    status: "choose",
    message: "Choose the matching building or add a more specific borough or ZIP.",
    candidates: deduped.slice(0, 8).map((address) => ({ key: address.key, label: addressLabel(address), bin: address.bin })),
  };
}

export function createAddressResolver(fetcher: typeof fetch = fetch) {
  const cachedAddress = publicCache<Resolution>(addressCacheMs, 256);
  return async function resolveAddress(input: AddressInput): Promise<Resolution> {
    const { houseStreet, area, error } = parseAddress(input);
    if (error || !houseStreet) return addressMatches({ type: "FeatureCollection", features: [] }, input);
    const street = houseStreet.house + " " + houseStreet.street;
    const query = [street, area?.zip ?? area?.borough].filter(Boolean).join(", ");
    return cachedAddress(JSON.stringify(["geosearch-v2", street, area?.borough, area?.zip, input.selection]), async () => {
      const endpoint = new URL("https://geosearch.planninglabs.nyc/v2/search");
      endpoint.search = new URLSearchParams({ text: query, size: "14" }).toString();
      try {
        const response = await fetcher(endpoint, {
          signal: AbortSignal.timeout(6500),
          cache: "no-store",
        });
        if (!response.ok) return { status: "unavailable", message: availabilityMessage };
        return addressMatches(await response.json(), input);
      } catch {
        return { status: "unavailable", message: availabilityMessage };
      }
    }, (resolution) => resolution.status === "confirmed");
  };
}

export const resolveAddress = createAddressResolver();

export function streetQueryVariants(street: string) {
  const parts = splitHouse(street);
  if (!parts) return [];
  const base = parts.house + " " + parts.street;
  const words = base.split(" ");
  const suffix = words.at(-1)!;
  const abbreviations = (suffixNames[suffix] ?? []).map((alias) => [...words.slice(0, -1), alias].join(" "));
  if (parts.street === "GRAND CONCOURSE") abbreviations.push(parts.house + " THE GRAND CONCOURSE");
  return [base, ...abbreviations];
}

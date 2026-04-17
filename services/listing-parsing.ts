import type { AnalysisInput } from "@/types";

const ADDRESS_PATTERN =
  /\b\d{1,5}\s+(?:[NSEW]\b\.?\s+|North\s+|South\s+|East\s+|West\s+)?[A-Za-z0-9.'-]+(?:\s+[A-Za-z0-9.'-]+){0,4}\s+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Place|Pl|Lane|Ln|Drive|Dr|Court|Ct|Way)\b(?:\s*#?\w+)?/i;

const MANHATTAN_NEIGHBORHOODS = [
  "Battery Park City",
  "Carnegie Hill",
  "Central Harlem",
  "Chelsea",
  "Chinatown",
  "East Harlem",
  "East Village",
  "Financial District",
  "Flatiron",
  "Gramercy",
  "Greenwich Village",
  "Harlem",
  "Hell's Kitchen",
  "Hudson Square",
  "Hudson Yards",
  "Inwood",
  "Kips Bay",
  "Lenox Hill",
  "Lincoln Square",
  "Little Italy",
  "Lower East Side",
  "Midtown East",
  "Midtown West",
  "Morningside Heights",
  "Murray Hill",
  "NoHo",
  "NoMad",
  "Nolita",
  "Roosevelt Island",
  "SoHo",
  "Stuyvesant Town",
  "Sutton Place",
  "Tribeca",
  "Two Bridges",
  "Union Square",
  "Upper East Side",
  "Upper West Side",
  "Washington Heights",
  "West Village",
  "Yorkville",
];

function titleCaseWord(word: string) {
  if (!word) {
    return word;
  }

  if (/^\d+(st|nd|rd|th)$/i.test(word)) {
    return word.toLowerCase();
  }

  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

function toOrdinal(value: string) {
  const parsed = Number(value);

  if (!Number.isInteger(parsed)) {
    return value;
  }

  const remainder100 = parsed % 100;
  if (remainder100 >= 11 && remainder100 <= 13) {
    return `${parsed}th`;
  }

  switch (parsed % 10) {
    case 1:
      return `${parsed}st`;
    case 2:
      return `${parsed}nd`;
    case 3:
      return `${parsed}rd`;
    default:
      return `${parsed}th`;
  }
}

function normalizeStreetEasyAddressSegment(segment: string) {
  const replacements: Record<string, string> = {
    st: "St",
    street: "Street",
    ave: "Ave",
    avenue: "Avenue",
    rd: "Rd",
    road: "Road",
    blvd: "Blvd",
    boulevard: "Boulevard",
    pl: "Pl",
    place: "Place",
    ln: "Ln",
    lane: "Lane",
    dr: "Dr",
    drive: "Drive",
    ct: "Ct",
    court: "Court",
    e: "East",
    east: "East",
    w: "West",
    west: "West",
    n: "North",
    north: "North",
    s: "South",
    south: "South",
  };

  return segment
    .replace(/_/g, "-")
    .split("-")
    .filter(Boolean)
    .map((part) => {
      if (/^\d+$/.test(part)) {
        return toOrdinal(part);
      }

      return replacements[part.toLowerCase()] ?? titleCaseWord(part);
    })
    .join(" ")
    .replace(/\b(\d+)\s+Street\b/gi, (_, digits: string) => `${toOrdinal(digits)} Street`);
}

function extractStreetEasyAddress(listingUrl?: string) {
  if (!listingUrl) {
    return undefined;
  }

  try {
    const url = new URL(listingUrl);

    if (!url.hostname.includes("streeteasy.com")) {
      return undefined;
    }

    const match = url.pathname.match(/\/building\/([^/]+)/i);
    if (!match?.[1]) {
      return undefined;
    }

    const buildingSlug = match[1].replace(/_new-york|_new_york|-new-york|-new_york/i, "");
    return normalizeStreetEasyAddressSegment(buildingSlug);
  } catch {
    return undefined;
  }
}

function extractAddressFromMessage(messageText?: string) {
  const match = messageText?.match(ADDRESS_PATTERN);
  return match?.[0]?.trim();
}

function extractRentFromMessage(messageText?: string) {
  const match = messageText?.match(/\$?\s?(\d{1,2},\d{3})\s*\/?\s*(?:month|mo|monthly)?/i);
  const digits = match?.[1]?.replace(/,/g, "");
  const parsed = digits ? Number(digits) : undefined;

  return typeof parsed === "number" && Number.isFinite(parsed) ? parsed : undefined;
}

function extractNeighborhoodFromMessage(messageText?: string) {
  if (!messageText) {
    return undefined;
  }

  const match = MANHATTAN_NEIGHBORHOODS.find((neighborhood) =>
    new RegExp(`\\b${neighborhood.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(messageText),
  );

  return match;
}

function buildListingTitle(address?: string) {
  return address ? `Listing at ${address}` : "Rental listing submission";
}

export async function parseListing(
  input: Pick<AnalysisInput, "listingUrl" | "manualRent" | "messageText">,
) {
  const messageAddress = extractAddressFromMessage(input.messageText);
  const urlAddress = extractStreetEasyAddress(input.listingUrl);
  const neighborhood = extractNeighborhoodFromMessage(input.messageText);
  const address = messageAddress ?? urlAddress;

  const notes = [
    messageAddress ? "Parsed address from submitted message text." : "",
    !messageAddress && urlAddress ? "Parsed address from listing URL structure." : "",
    neighborhood ? `Parsed neighborhood context from submitted message text (${neighborhood}).` : "",
    !messageAddress && !urlAddress ? "Could not parse a concrete address from the URL or message text." : "",
  ].filter(Boolean);

  return {
    title: buildListingTitle(address),
    address,
    neighborhood,
    extractedRent: input.manualRent ?? extractRentFromMessage(input.messageText),
    sourceUrl: input.listingUrl,
    notes,
  };
}

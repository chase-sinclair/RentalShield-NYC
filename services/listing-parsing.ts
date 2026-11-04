import type { AnalysisInput } from "@/types";

type AddressSource = "message" | "manual" | "metadata" | "url";

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

  const streetTypeTokens = new Set(["st", "street"]);
  const unitTokens = new Set(["apt", "apartment", "unit"]);
  const parts = segment
    .replace(/_/g, "-")
    .split("-")
    .filter(Boolean);

  return parts
    .map((part, index) => {
      const nextPart = parts[index + 1]?.toLowerCase();
      const previousPart = parts[index - 1]?.toLowerCase();

      if (/^\d+$/.test(part) && streetTypeTokens.has(nextPart ?? "")) {
        return toOrdinal(part);
      }

      if (/^\d+$/.test(part) && unitTokens.has(previousPart ?? "")) {
        return part.toUpperCase();
      }

      return replacements[part.toLowerCase()] ?? titleCaseWord(part);
    })
    .join(" ")
    .replace(/\b(\d+)\s+Street\b/gi, (_, digits: string) => `${toOrdinal(digits)} Street`);
}

function normalizeAddressCandidate(value?: string) {
  if (!value) {
    return undefined;
  }

  return value
    .replace(/\bAPT\b/gi, "Apt")
    .replace(/\bUNIT\b/gi, "Unit")
    .replace(/\s+/g, " ")
    .trim();
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
    return normalizeAddressCandidate(normalizeStreetEasyAddressSegment(buildingSlug));
  } catch {
    return undefined;
  }
}

function getPathSegments(listingUrl?: string) {
  if (!listingUrl) {
    return [];
  }

  try {
    return new URL(listingUrl).pathname.split("/").filter(Boolean);
  } catch {
    return [];
  }
}

function normalizeGenericAddressSlug(segment: string) {
  const cleaned = segment
    .replace(/_new-york|_new_york|-new-york|-new_york/i, "")
    .replace(/\b\d{5}\b/g, "")
    .replace(/\b(?:apartment|homedetails|building)\b/gi, "")
    .replace(/\b(?:id|zpid)\d+\b/gi, "")
    .replace(/(?:_zpid|_id\d+|id\d+)$/gi, "")
    .replace(/[^a-zA-Z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  const normalized = normalizeStreetEasyAddressSegment(cleaned)
    .replace(/\bApt\s+(\w+)$/i, "Apt $1")
    .replace(/\bUnit\s+(\w+)$/i, "Unit $1");

  return normalizeAddressCandidate(normalized);
}

function extractKnownPlatformAddress(listingUrl?: string) {
  if (!listingUrl) {
    return undefined;
  }

  try {
    const url = new URL(listingUrl);
    const segments = getPathSegments(listingUrl);
    const hostname = url.hostname.toLowerCase();

    if (hostname.includes("redfin.com")) {
      const stateIndex = segments.findIndex((segment) => segment.toUpperCase() === "NY");
      const cityIndex = stateIndex + 1;
      const addressIndex = cityIndex + 1;
      const unitIndex = segments.findIndex((segment) => segment.toLowerCase() === "unit");
      const addressSegment = segments[addressIndex];
      const unitSegment = unitIndex >= 0 ? segments[unitIndex + 1] : undefined;

      if (addressSegment) {
        return normalizeAddressCandidate(
          [normalizeGenericAddressSlug(addressSegment), unitSegment ? `Unit ${unitSegment.toUpperCase()}` : ""]
            .filter(Boolean)
            .join(" "),
        );
      }
    }

    if (hostname.includes("apartments.com")) {
      const candidate = segments.find((segment) => /new-york-ny/i.test(segment));
      if (candidate) {
        return normalizeGenericAddressSlug(candidate.replace(/-new-york-ny.*$/i, ""));
      }
    }

    if (hostname.includes("zillow.com")) {
      const homeDetailsIndex = segments.findIndex((segment) => segment.toLowerCase() === "homedetails");
      const candidate = homeDetailsIndex >= 0 ? segments[homeDetailsIndex + 1] : undefined;
      if (candidate) {
        return normalizeGenericAddressSlug(candidate.replace(/-new-york-ny.*$/i, ""));
      }
    }

    return undefined;
  } catch {
    return undefined;
  }
}

function extractGenericUrlAddress(listingUrl?: string) {
  const segments = getPathSegments(listingUrl);
  const candidate = segments.find((segment) =>
    /\d/.test(segment) &&
    /(?:st|street|ave|avenue|rd|road|blvd|boulevard|pl|place|ln|lane|dr|drive|ct|court)/i.test(segment),
  );

  return candidate ? normalizeGenericAddressSlug(candidate) : undefined;
}

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&#39;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function extractMetadataText(html: string) {
  const title = html.match(/<title[^>]*>(.*?)<\/title>/is)?.[1] ?? "";
  const metaMatches = Array.from(
    html.matchAll(/<meta\b[^>]*(?:property|name)=["'](?:og:title|og:description|description)["'][^>]*content=["']([^"']+)["'][^>]*>/gi),
  );
  const reversedMetaMatches = Array.from(
    html.matchAll(/<meta\b[^>]*content=["']([^"']+)["'][^>]*(?:property|name)=["'](?:og:title|og:description|description)["'][^>]*>/gi),
  );

  return [title, ...metaMatches.map((match) => match[1]), ...reversedMetaMatches.map((match) => match[1])]
    .map((value) => decodeHtmlEntities(value.replace(/<[^>]+>/g, " ")))
    .join(" ");
}

export async function extractListingMetadata(listingUrl?: string) {
  if (!listingUrl) {
    return {
      text: "",
      notes: [] as string[],
    };
  }

  try {
    const response = await fetch(listingUrl, {
      headers: {
        "User-Agent": "RentalShieldNYC/0.1 metadata preflight",
      },
      signal: AbortSignal.timeout(6000),
      next: { revalidate: 300 },
    });

    if (!response.ok) {
      return {
        text: "",
        notes: [`Listing metadata fetch returned status ${response.status}.`],
      };
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html")) {
      return {
        text: "",
        notes: ["Listing metadata response was not HTML."],
      };
    }

    const html = await response.text();
    return {
      text: extractMetadataText(html),
      notes: ["Fetched listing page metadata for address extraction."],
    };
  } catch {
    return {
      text: "",
      notes: ["Listing metadata could not be fetched during preflight."],
    };
  }
}

function extractAddressFromMessage(messageText?: string) {
  const match = messageText?.match(ADDRESS_PATTERN);
  return normalizeAddressCandidate(match?.[0]?.trim());
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
  input: Pick<AnalysisInput, "listingUrl" | "manualAddress" | "manualRent" | "messageText">,
) {
  const messageAddress = extractAddressFromMessage(input.messageText);
  const manualAddress = normalizeAddressCandidate(input.manualAddress);
  const shouldFetchMetadata = Boolean(input.listingUrl && !messageAddress && !manualAddress);
  const metadata = shouldFetchMetadata
    ? await extractListingMetadata(input.listingUrl)
    : {
        text: "",
        notes: [] as string[],
      };
  const metadataAddress = extractAddressFromMessage(metadata.text);
  const urlAddress =
    extractStreetEasyAddress(input.listingUrl) ??
    extractKnownPlatformAddress(input.listingUrl) ??
    extractGenericUrlAddress(input.listingUrl);
  const neighborhood = extractNeighborhoodFromMessage(input.messageText);
  const address = messageAddress ?? manualAddress ?? metadataAddress ?? urlAddress;
  const addressSource: AddressSource | undefined = messageAddress
    ? "message"
    : manualAddress
      ? "manual"
      : metadataAddress
        ? "metadata"
        : urlAddress
          ? "url"
          : undefined;

  const notes = [
    messageAddress ? "Parsed address from submitted message text." : "",
    !messageAddress && manualAddress ? "Used manually supplied address for verification." : "",
    !messageAddress && !manualAddress && metadataAddress ? "Parsed address from listing page metadata." : "",
    !messageAddress && !manualAddress && !metadataAddress && urlAddress ? "Parsed address from listing URL structure." : "",
    ...metadata.notes,
    neighborhood ? `Parsed neighborhood context from submitted message text (${neighborhood}).` : "",
    !address ? "Could not parse a concrete address from the URL, metadata, manual input, or message text." : "",
  ].filter(Boolean);

  return {
    title: buildListingTitle(address),
    address,
    addressSource,
    neighborhood,
    extractedRent: input.manualRent ?? extractRentFromMessage(input.messageText),
    sourceUrl: input.listingUrl,
    notes,
  };
}

export async function preflightListingAddress(
  input: Pick<AnalysisInput, "listingUrl" | "manualAddress" | "messageText">,
) {
  const parsed = await parseListing(input);

  return {
    addressFound: Boolean(parsed.address),
    candidateAddress: parsed.address,
    source: parsed.addressSource,
    needsManualAddress: !parsed.address,
    notes: parsed.notes,
  };
}

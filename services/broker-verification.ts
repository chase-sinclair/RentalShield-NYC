import type { ContactRole } from "@/types";

interface VerifyContactIdentityInput {
  role?: ContactRole;
  name?: string;
}

interface OfficialBrokerRecord {
  business_name?: string;
  license_holder_name?: string;
  license_number?: string;
  license_type?: string;
  license_expiration_date?: string;
}

const NY_OPEN_DATA_BROKER_LOOKUP_URL = "https://data.ny.gov/resource/yg7h-zjbf.json";

function getRoleLabel(role?: ContactRole) {
  switch (role) {
    case "broker_agent":
      return "broker or agent";
    case "owner":
      return "owner";
    case "property_manager":
      return "property manager";
    case "leasing_office":
      return "leasing office";
    case "unknown":
      return "contact";
    default:
      return "contact";
  }
}

function tokenizeName(name?: string) {
  if (!name) {
    return [];
  }

  return Array.from(
    new Set(
      name
        .trim()
        .toUpperCase()
        .split(/[^A-Z0-9]+/)
        .map((part) => part.trim())
        .filter((part) => part.length >= 2),
    ),
  );
}

function normalizeRecordName(name?: string) {
  return tokenizeName(name).join(" ");
}

function buildOfficialLookupUrl(tokens: string[]) {
  const whereClause = tokens
    .map((token) => `upper(license_holder_name) like '%${token.replace(/'/g, "''")}%'`)
    .join(" AND ");

  const params = new URLSearchParams({
    $select: "license_holder_name,license_number,license_type,license_expiration_date,business_name",
    $where: whereClause,
    $order: "license_holder_name asc",
    $limit: "10",
  });

  return `${NY_OPEN_DATA_BROKER_LOOKUP_URL}?${params.toString()}`;
}

function classifyOfficialRecords(records: OfficialBrokerRecord[], submittedName: string) {
  const normalizedSubmittedName = normalizeRecordName(submittedName);
  const normalizedSubmittedTokens = normalizedSubmittedName.split(/\s+/).filter(Boolean);

  const exactTokenMatches = records.filter((record) => {
    const normalizedRecordName = normalizeRecordName(record.license_holder_name);
    const recordTokens = normalizedRecordName.split(/\s+/).filter(Boolean);

    return (
      normalizedSubmittedTokens.length > 0 &&
      normalizedSubmittedTokens.every((token) => recordTokens.includes(token))
    );
  });

  if (exactTokenMatches.length === 1) {
    const match = exactTokenMatches[0];
    const licenseType = match.license_type?.toLowerCase() ?? "license";

    return {
      matched: true,
      ambiguous: false,
      confidence: 0.82,
      notes: [
        `A single official NY real estate ${licenseType} match was found for this submitted name.`,
      ],
    };
  }

  if (exactTokenMatches.length > 1 || records.length > 1) {
    return {
      matched: false,
      ambiguous: true,
      confidence: 0.48,
      notes: [
        "Multiple official NY real estate matches were found for this name, so identity could not be confirmed from name alone.",
      ],
    };
  }

  return {
    matched: false,
    ambiguous: false,
    confidence: 0.4,
    notes: ["No official NY real estate name match was found in the active license dataset."],
  };
}

export async function verifyContactIdentity(input: VerifyContactIdentityInput) {
  const role = input.role ?? "unknown";
  const roleLabel = getRoleLabel(role);
  const hasName = Boolean(input.name?.trim());

  if (!hasName) {
    return {
      status: "skipped" as const,
      matched: false,
      ambiguous: false,
      shouldPenalize: false,
      notes: [`Not enough ${roleLabel} identity details were supplied to verify this contact by name.`],
    };
  }

  const nameTokens = tokenizeName(input.name);
  if (!nameTokens.length) {
    return {
      status: "skipped" as const,
      matched: false,
      ambiguous: false,
      shouldPenalize: false,
      notes: ["The submitted contact name could not be parsed into a usable official lookup query."],
    };
  }

  try {
    const response = await fetch(buildOfficialLookupUrl(nameTokens), {
      method: "GET",
      signal: AbortSignal.timeout(8000),
      next: { revalidate: 86400 },
    });

    if (!response.ok) {
      throw new Error(`Official broker lookup failed with status ${response.status}`);
    }

    const records = (await response.json()) as OfficialBrokerRecord[];
    const classifiedResult = classifyOfficialRecords(records, input.name ?? "");

    return {
      status: "completed" as const,
      matched: classifiedResult.matched,
      ambiguous: classifiedResult.ambiguous,
      shouldPenalize: role === "broker_agent" && !classifiedResult.matched && !classifiedResult.ambiguous,
      confidence: classifiedResult.confidence,
      notes: classifiedResult.notes,
    };
  } catch (error) {
    console.error("Official name lookup failed:", error);
    return {
      status: "mock" as const,
      matched: false,
      ambiguous: false,
      shouldPenalize: false,
      confidence: 0.34,
      notes: ["Official NY real estate name lookup is currently unavailable, so identity could not be confirmed automatically."],
    };
  }
}

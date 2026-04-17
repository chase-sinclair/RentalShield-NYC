import { serverEnv } from "@/lib/config/env";
import type { ContactRole } from "@/types";

interface VerifyContactIdentityInput {
  role?: ContactRole;
  name?: string;
}

function splitFullName(name?: string) {
  if (!name) {
    return null;
  }

  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length < 2) {
    return null;
  }

  return {
    firstName: parts.slice(0, -1).join(" "),
    lastName: parts.at(-1) ?? "",
  };
}

function getRoleLabel(role?: ContactRole) {
  switch (role) {
    case "broker_agent":
      return "broker";
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

  const parsedName = splitFullName(input.name);
  if (!parsedName) {
    return {
      status: "skipped" as const,
      matched: false,
      ambiguous: false,
      shouldPenalize: false,
      notes: [
        "A full first and last name is needed for the official NY license name search.",
      ],
    };
  }

  if (!serverEnv.nyLicenseLookupBaseUrl) {
    return {
      status: "mock" as const,
      matched: false,
      ambiguous: false,
      shouldPenalize: false,
      confidence: 0.34,
      notes: [
        "Official broker registry lookup is not currently configured, so broker identity is being treated as unconfirmed rather than failed.",
      ],
    };
  }

  try {
    const formData = new URLSearchParams({
      firstName: parsedName.firstName,
      lastName: parsedName.lastName,
      searchBy: "INDIVIDUAL",
      page: "searchByName",
      maxRows: "5",
      submit: "Search",
    });
    const response = await fetch(serverEnv.nyLicenseLookupBaseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
      signal: AbortSignal.timeout(8000),
      next: { revalidate: 0 },
    });

    if (!response.ok) {
      throw new Error(`Broker lookup failed with status ${response.status}`);
    }

    const html = await response.text();
    const normalizedHtml = html.toLowerCase();
    const fullName = `${parsedName.firstName} ${parsedName.lastName}`.toLowerCase();
    const matchCount = normalizedHtml.split(fullName).length - 1;
    const matched = matchCount === 1;
    const ambiguous = matchCount > 1;

    return {
      status: "completed" as const,
      matched,
      ambiguous,
      shouldPenalize: role === "broker_agent" && !matched && !ambiguous,
      confidence: matched ? 0.8 : ambiguous ? 0.46 : 0.4,
      notes: matched
        ? ["A single official name match was found in the current NY license lookup response."]
        : ambiguous
          ? ["Multiple official matches were found for this name, so identity could not be confirmed from name alone."]
          : ["No official name match was found in the current NY license lookup response."],
    };
  } catch (error) {
    console.error("Official name lookup failed:", error);
    return {
      status: "mock" as const,
      matched: false,
      ambiguous: false,
      shouldPenalize: false,
      confidence: 0.34,
      notes: ["Official name lookup is currently unavailable, so identity could not be confirmed automatically."],
    };
  }
}

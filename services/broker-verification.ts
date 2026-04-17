import { serverEnv } from "@/lib/config/env";
import type { ContactRole } from "@/types";

interface VerifyContactIdentityInput {
  role?: ContactRole;
  name?: string;
}

function stripHtml(value: string) {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&#39;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function getCookieHeader(response: Response) {
  const headerBag = response.headers as Headers & {
    getSetCookie?: () => string[];
  };

  if (typeof headerBag.getSetCookie === "function") {
    return headerBag
      .getSetCookie()
      .map((cookie) => cookie.split(";")[0])
      .join("; ");
  }

  const setCookie = response.headers.get("set-cookie");
  if (!setCookie) {
    return "";
  }

  return setCookie
    .split(/,(?=[^;]+?=)/)
    .map((cookie) => cookie.split(";")[0])
    .join("; ");
}

function classifyOfficialNameSearch(html: string, parsedName: { firstName: string; lastName: string }) {
  if (!/Search Results List|License Number/i.test(html)) {
    throw new Error("Official name lookup returned an unexpected response shape.");
  }

  const resultSection = html.split(/Search Results List/i).at(-1) ?? html;
  const linkedNames = Array.from(resultSection.matchAll(/<a\b[^>]*>(.*?)<\/a>/gi))
    .map((match) => stripHtml(match[1] ?? ""))
    .filter((value) => {
      const normalized = value.toLowerCase();
      return (
        normalized.length > 3 &&
        normalized !== "back" &&
        normalized !== "new search" &&
        !normalized.includes("here's how you know")
      );
    });

  const uniqueNames = Array.from(new Set(linkedNames));
  if (uniqueNames.length === 0) {
    return {
      matched: false,
      ambiguous: false,
      confidence: 0.4,
      notes: ["No official name match was found in the current NY license lookup response."],
    };
  }

  const fullName = `${parsedName.firstName} ${parsedName.lastName}`.toLowerCase();
  const fullNameTokens = fullName.split(/\s+/).filter(Boolean);
  const exactMatches = uniqueNames.filter((candidate) => candidate.toLowerCase() === fullName);

  if (exactMatches.length === 1 && uniqueNames.length === 1) {
    return {
      matched: true,
      ambiguous: false,
      confidence: 0.8,
      notes: ["A single official name match was found in the current NY license lookup response."],
    };
  }

  const tokenMatches = uniqueNames.filter((candidate) => {
    const normalized = candidate.toLowerCase();
    return fullNameTokens.every((token) => normalized.includes(token));
  });

  if (tokenMatches.length === 1 && uniqueNames.length === 1) {
    return {
      matched: true,
      ambiguous: false,
      confidence: 0.76,
      notes: ["A likely official name match was found in the current NY license lookup response."],
    };
  }

  if (tokenMatches.length > 1 || uniqueNames.length > 1) {
    return {
      matched: false,
      ambiguous: true,
      confidence: 0.46,
      notes: ["Multiple official matches were found for this name, so identity could not be confirmed from name alone."],
    };
  }

  return {
    matched: false,
    ambiguous: false,
    confidence: 0.4,
    notes: ["No official name match was found in the current NY license lookup response."],
  };
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
    const preflightResponse = await fetch(serverEnv.nyLicenseLookupBaseUrl, {
      method: "GET",
      signal: AbortSignal.timeout(8000),
      next: { revalidate: 0 },
    });
    const cookieHeader = getCookieHeader(preflightResponse);

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
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
        Referer: serverEnv.nyLicenseLookupBaseUrl,
      },
      body: formData.toString(),
      signal: AbortSignal.timeout(8000),
      next: { revalidate: 0 },
    });

    if (!response.ok) {
      throw new Error(`Broker lookup failed with status ${response.status}`);
    }

    const html = await response.text();
    const classifiedResult = classifyOfficialNameSearch(html, parsedName);

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
      notes: ["Official name lookup is currently unavailable, so identity could not be confirmed automatically."],
    };
  }
}

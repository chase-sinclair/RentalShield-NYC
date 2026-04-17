import { serverEnv } from "@/lib/config/env";
import type { ContactRole } from "@/types";

interface VerifyContactIdentityInput {
  role?: ContactRole;
  name?: string;
  company?: string;
  email?: string;
  phone?: string;
  licenseNumber?: string;
}

function hasVerifiableIdentityDetails(input: VerifyContactIdentityInput) {
  return Boolean(input.name || input.company || input.email || input.phone || input.licenseNumber);
}

function countSupportingIdentitySignals(input: VerifyContactIdentityInput) {
  return [input.company, input.email, input.phone, input.licenseNumber].filter(Boolean).length;
}

function getRoleLabel(role?: ContactRole) {
  switch (role) {
    case "broker":
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
  const hasDetails = hasVerifiableIdentityDetails(input);

  if (!hasDetails) {
    return {
      status: "skipped" as const,
      matched: false,
      shouldPenalize: false,
      notes: [`Not enough ${roleLabel} identity details were supplied to verify this contact.`],
    };
  }

  if (role !== "broker") {
    const signalCount = countSupportingIdentitySignals(input);

    return {
      status: "completed" as const,
      matched: signalCount >= 1,
      shouldPenalize: false,
      confidence: signalCount >= 2 ? 0.7 : 0.55,
      notes: [
        signalCount >= 2
          ? `Submitted ${roleLabel} details include multiple identity signals that can support follow-up verification.`
          : `Submitted ${roleLabel} details are partial, so identity is better treated as unconfirmed rather than suspicious.`,
      ],
    };
  }

  if (!serverEnv.nyLicenseLookupBaseUrl) {
    return {
      status: "mock" as const,
      matched: false,
      shouldPenalize: false,
      confidence: 0.34,
      notes: [
        "Official broker registry lookup is not currently configured, so broker identity is being treated as unconfirmed rather than failed.",
      ],
    };
  }

  try {
    const query = [input.licenseNumber, input.name, input.company].filter(Boolean).join(" ").trim();
    const params = new URLSearchParams({
      search: query,
    });
    const response = await fetch(`${serverEnv.nyLicenseLookupBaseUrl}?${params.toString()}`, {
      method: "GET",
      signal: AbortSignal.timeout(8000),
      next: { revalidate: 0 },
    });

    if (!response.ok) {
      throw new Error(`Broker lookup failed with status ${response.status}`);
    }

    const html = await response.text();
    const normalizedHtml = html.toLowerCase();
    const brokerMatch = input.name ? normalizedHtml.includes(input.name.toLowerCase()) : false;
    const companyMatch = input.company ? normalizedHtml.includes(input.company.toLowerCase()) : false;
    const licenseMatch = input.licenseNumber ? normalizedHtml.includes(input.licenseNumber.toLowerCase()) : false;
    const matched = brokerMatch || companyMatch || licenseMatch;

    return {
      status: "completed" as const,
      matched,
      shouldPenalize: !matched,
      confidence: matched ? 0.78 : 0.44,
      notes: matched
        ? ["A possible broker match was found in the current license lookup response."]
        : ["No confident broker match was found in the current license lookup response."],
    };
  } catch (error) {
    return {
      status: "mock" as const,
      matched: false,
      shouldPenalize: false,
      confidence: 0.34,
      notes: [
        error instanceof Error
          ? `Broker verification fallback used: ${error.message}`
          : "Broker verification fallback used because the live request failed.",
      ],
    };
  }
}

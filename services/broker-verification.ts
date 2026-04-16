import { serverEnv } from "@/lib/config/env";

export async function verifyBroker(brokerName?: string, company?: string) {
  if (!brokerName && !company) {
    return {
      status: "skipped" as const,
      matched: false,
      notes: ["Not enough broker information was supplied to verify identity."],
    };
  }

  if (!serverEnv.nyLicenseLookupBaseUrl) {
    return {
      status: "mock" as const,
      matched: false,
      confidence: 0.34,
      notes: ["Broker verification is using fallback behavior because no license lookup base URL is configured."],
    };
  }

  try {
    const query = [brokerName, company].filter(Boolean).join(" ").trim();
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
    const brokerMatch = brokerName ? normalizedHtml.includes(brokerName.toLowerCase()) : false;
    const companyMatch = company ? normalizedHtml.includes(company.toLowerCase()) : false;
    const matched = brokerMatch || companyMatch;

    return {
      status: "completed" as const,
      matched,
      confidence: matched ? 0.74 : 0.41,
      notes: matched
        ? ["A possible broker or company match was found in the NY license lookup response."]
        : ["No confident broker or company match was found in the NY license lookup response."],
    };
  } catch (error) {
    return {
      status: "mock" as const,
      matched: false,
      confidence: 0.34,
      notes: [
        error instanceof Error
          ? `Broker verification fallback used: ${error.message}`
          : "Broker verification fallback used because the live request failed.",
      ],
    };
  }
}

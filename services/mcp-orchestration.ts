import { mockAnalysisResult } from "@/lib/analysis/mock-data";
import { createTraceEntry } from "@/lib/mcp/orchestrator";
import type { AnalysisInput, AnalysisResult, ContactRole, StagedUploadAsset, UploadAsset } from "@/types";

import { verifyAddress } from "@/services/address-verification";
import { getActiveBedrockModel } from "@/services/bedrock-model-selection";
import { verifyContactIdentity } from "@/services/broker-verification";
import { parseListing } from "@/services/listing-parsing";
import { extractMessageSignals } from "@/services/message-extraction";
import { getPropertyContext } from "@/services/property-context";
import { compareRent } from "@/services/rent-comparison";
import { scoreScamRisk } from "@/services/scam-scoring";
import { extractScreenshotText } from "@/services/screenshot-ocr";

function uniqueList(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function formatContactRole(role?: ContactRole) {
  switch (role) {
    case "broker_agent":
      return "Broker / agent";
    case "owner":
      return "Owner / landlord";
    case "property_manager":
      return "Property manager";
    case "leasing_office":
      return "Leasing office";
    case "unknown":
      return "Unknown";
    default:
      return undefined;
  }
}

function hasStrongIdentityContext(input: {
  contactName?: string;
  company?: string;
  email?: string;
  phone?: string;
  licenseNumber?: string;
}) {
  const signals = [input.contactName, input.company, input.email, input.phone, input.licenseNumber].filter(Boolean).length;
  return signals >= 3;
}

function isSuspiciousShowingDetail(detail: string) {
  return [
    /can'?t show/i,
    /unable to show/i,
    /before viewing/i,
    /deposit/i,
    /refuses? in-person/i,
    /out of town/i,
    /no access/i,
    /without touring/i,
  ].some((pattern) => pattern.test(detail));
}

function isSpecificNeighborhood(neighborhood?: string, borough?: string) {
  if (!neighborhood) {
    return false;
  }

  const normalized = neighborhood.trim().toLowerCase();
  return Boolean(normalized) && normalized !== "manhattan" && normalized !== borough?.trim().toLowerCase();
}

function resolveNeighborhood(input: {
  verifiedNeighborhood?: string;
  borough?: string;
  parsedNeighborhood?: string;
}) {
  if (isSpecificNeighborhood(input.verifiedNeighborhood, input.borough)) {
    return {
      value: input.verifiedNeighborhood,
      source: "Geocoding",
    };
  }

  if (isSpecificNeighborhood(input.parsedNeighborhood, input.borough)) {
    return {
      value: input.parsedNeighborhood,
      source: "Listing parser + extraction",
    };
  }

  return {
    value: input.verifiedNeighborhood ?? input.parsedNeighborhood,
    source: input.verifiedNeighborhood ? "Geocoding" : "Listing parser + extraction",
  };
}

function buildConfidenceNote(input: {
  unavailableChecks: string[];
  degradedChecks: string[];
  uploads: UploadAsset[];
  modelIdUsed: string;
}) {
  if (
    input.unavailableChecks.length === 0 &&
    input.degradedChecks.length === 0 &&
    input.modelIdUsed !== "deterministic-fallback"
  ) {
    return "This estimate includes live tool checks and model reasoning, but it should still be treated as decision support rather than proof.";
  }

  if (input.degradedChecks.length > 0) {
    return "This estimate is directionally useful, but some checks ran with fallback logic or partial provider coverage, so independent verification is still important.";
  }

  if (input.unavailableChecks.length > 0) {
    return "This estimate used live analysis, but some verification steps could not run from the submitted evidence or available provider coverage.";
  }

  if (input.uploads.length > 0) {
    return "Screenshot evidence improved coverage, but OCR and reasoning confidence may vary with image quality and source completeness.";
  }

  return "This estimate is based on the evidence currently available and should be used as a screening aid, not a final determination.";
}

function buildVerifiedFacts(input: {
  normalizedAddress?: string;
  borough?: string;
  neighborhood?: string;
  neighborhoodSource?: string;
  extractedRent?: number;
  brokerName?: string;
  company?: string;
  contactRole?: string;
  contactEmail?: string;
  contactPhone?: string;
  licenseNumber?: string;
  uploads: UploadAsset[];
}) {
  return uniqueList([
    input.normalizedAddress ? `Address|${input.normalizedAddress}|Address verification tool` : "",
    input.borough ? `Borough|${input.borough}|Geocoding` : "",
    input.neighborhood ? `Neighborhood|${input.neighborhood}|${input.neighborhoodSource ?? "Geocoding"}` : "",
    typeof input.extractedRent === "number"
      ? `Claimed rent|$${input.extractedRent.toLocaleString()}|Listing parser + extraction`
      : "",
    input.contactRole ? `Contact role|${input.contactRole}|Form input + extraction` : "",
    input.brokerName ? `Contact name|${input.brokerName}|Form input + extraction` : "",
    input.company ? `Claimed company|${input.company}|Form input + extraction` : "",
    input.contactEmail ? `Contact email|${input.contactEmail}|Form input` : "",
    input.contactPhone ? `Contact phone|${input.contactPhone}|Form input` : "",
    input.licenseNumber ? `License number|${input.licenseNumber}|Form input` : "",
    input.uploads.length
      ? `Screenshot evidence received|${input.uploads.length} file${input.uploads.length === 1 ? "" : "s"} uploaded|Upload validation`
      : "",
  ]).map((item) => {
    const [label, value, source] = item.split("|");
    return { label, value, source };
  });
}

function buildRecommendedNextSteps(input: {
  label: AnalysisResult["label"];
  score: number;
  currentSteps: string[];
  role?: ContactRole;
  contactMissing: boolean;
}) {
  if (input.label === "low" && input.score <= 25) {
    return uniqueList([
      "Proceed with the showing and normal rental process if the apartment matches the listing in person.",
      input.contactMissing
        ? input.role === "broker_agent"
          ? "Ask for the broker's full name, brokerage, and license details before applying."
          : "Ask for the contact's full name, company, and direct contact details before applying."
        : "Keep the listing link, fee disclosures, and lease paperwork together as you move forward.",
      "Hold off on sending deposits or fees until the showing, lease terms, and payment instructions all line up in writing.",
    ]);
  }

  return input.currentSteps;
}

function buildDegradedChecks(input: {
  messageModelId: string;
  screenshotModelId: string;
  scoringModelId: string;
  uploads: UploadAsset[];
  hasMessageText: boolean;
  brokerStatus: "skipped" | "mock" | "completed";
}) {
  return uniqueList([
    input.hasMessageText && input.messageModelId === "heuristic-fallback"
      ? "message_extraction_tool used fallback extraction logic."
      : "",
    input.uploads.length && input.screenshotModelId === "mock-fallback"
      ? "ocr_or_multimodal_extraction_tool used fallback screenshot extraction."
      : "",
    input.scoringModelId === "deterministic-fallback"
      ? "risk_scoring_tool used deterministic fallback scoring."
      : "",
    input.brokerStatus === "mock"
      ? "broker_verification_tool used fallback provider behavior."
      : "",
  ]);
}

function buildSystemNotes(input: {
  messageNotes: string[];
  screenshotNotes: string[];
  scoringNotes: string[];
  addressNotes: string[];
  propertyNotes: string[];
  rentNotes: string[];
  brokerNotes: string[];
}) {
  return uniqueList([
    ...input.messageNotes,
    ...input.screenshotNotes,
    ...input.scoringNotes,
    ...input.addressNotes,
    ...input.propertyNotes,
    ...input.rentNotes,
    ...input.brokerNotes,
  ]);
}

export async function runAnalysisOrchestration(
  input: AnalysisInput,
  uploads: StagedUploadAsset[] = [],
): Promise<{ data: AnalysisResult; trace: ReturnType<typeof createTraceEntry>[] }> {
  const trace = [];

  const parsedListing = await parseListing(input);
  trace.push(
    createTraceEntry(
      "listing_parser_tool",
      "completed",
      parsedListing.notes.join(" ") || "Parsed listing URL and rent hints.",
    ),
  );

  const screenshotExtraction = await extractScreenshotText(uploads);
  trace.push(
    createTraceEntry(
      "ocr_or_multimodal_extraction_tool",
      uploads.length ? "completed" : "skipped",
      uploads.length
        ? screenshotExtraction.notes.join(" ") || "Processed screenshot evidence."
        : "No screenshots provided.",
    ),
  );

  const messageSignals = await extractMessageSignals({
    messageText: [input.messageText, screenshotExtraction.text].filter(Boolean).join("\n"),
  });
  trace.push(createTraceEntry("message_extraction_tool", "completed", "Extracted message-level scam signals."));

  const contactRole = input.contactRole ?? "unknown";
  const contactName = input.contactName ?? messageSignals.brokerName;
  const contactCompany = input.contactCompany ?? messageSignals.company;
  const contactEmail = input.contactEmail;
  const contactPhone = input.contactPhone;
  const contactLicenseNumber = input.contactLicenseNumber;
  const strongIdentityContext = hasStrongIdentityContext({
    contactName,
    company: contactCompany,
    email: contactEmail,
    phone: contactPhone,
    licenseNumber: contactLicenseNumber,
  });

  const addressVerification = await verifyAddress(parsedListing.address);
  trace.push(
    createTraceEntry(
      "address_verification_tool",
      addressVerification.status === "completed" ? "completed" : "skipped",
      addressVerification.notes.join(" ") || "Address verification completed.",
    ),
  );

  const propertyContext = await getPropertyContext(addressVerification.normalizedAddress);
  trace.push(createTraceEntry("nyc_property_context_tool", "completed", "Loaded property plausibility placeholder."));

  const brokerVerification = await verifyContactIdentity({
    role: contactRole,
    name: contactName,
    company: contactCompany,
    email: contactEmail,
    phone: contactPhone,
    licenseNumber: contactLicenseNumber,
  });
  trace.push(
    createTraceEntry(
      "broker_verification_tool",
      brokerVerification.status === "skipped" ? "skipped" : "completed",
      brokerVerification.notes.join(" "),
    ),
  );

  const rentContext = await compareRent(addressVerification.normalizedAddress, parsedListing.extractedRent);
  trace.push(
    createTraceEntry(
      "rent_comparison_tool",
      rentContext.status === "completed" ? "completed" : "skipped",
      rentContext.notes.join(" "),
    ),
  );

  const resolvedNeighborhood = resolveNeighborhood({
    verifiedNeighborhood: addressVerification.neighborhood,
    borough: addressVerification.borough,
    parsedNeighborhood: parsedListing.neighborhood,
  });

  const rankedFactors = uniqueList([
    ...(rentContext.status === "completed" && rentContext.belowRange
      ? ["Quoted rent appears meaningfully below neighborhood context"]
      : []),
    ...messageSignals.urgencySignals,
    ...messageSignals.tourLimitations.filter(isSuspiciousShowingDetail),
    ...(uploads.length ? ["Screenshot evidence contains rental scam review signals"] : []),
    ...(contactRole === "broker_agent" && brokerVerification.shouldPenalize
      ? ["Broker identity could not be confidently verified"]
      : []),
  ])
    .map((title, index) => {
      const isRentFactor = title === "Quoted rent appears meaningfully below neighborhood context";
      const rentSeverity = rentContext.status === "completed" ? rentContext.severity : "none";
      const rentContribution = rentContext.status === "completed" ? rentContext.contribution : 0;

      return {
        title,
        severity:
          isRentFactor
            ? rentSeverity === "none"
              ? "low"
              : rentSeverity
            : index === 0 || title.toLowerCase().includes("deposit")
              ? "high"
              : title.toLowerCase().includes("verified")
                ? "medium"
                : "medium",
        contribution:
          isRentFactor
            ? rentContribution
            : title.toLowerCase().includes("deposit")
              ? 18
              : title.toLowerCase().includes("verified")
                ? 14
                : 12,
        explanation:
          isRentFactor
            ? rentSeverity === "high"
              ? "The quoted rent is materially below the current comparison range for the normalized address."
              : rentSeverity === "medium"
                ? "The quoted rent is somewhat below the current comparison range for the normalized address."
                : "The quoted rent sits slightly below the current comparison range for the normalized address."
            : `${title} was detected from the current evidence and contributes to the overall scam estimate.`,
        evidenceSource:
          title.toLowerCase().includes("screenshot")
            ? "screenshot"
            : title.toLowerCase().includes("below") || title.toLowerCase().includes("verified")
              ? "tool"
              : "message",
      };
    }) as AnalysisResult["rankedFactors"];

  const unavailableChecks = trace
    .filter((entry) => {
      if (entry.status === "completed") {
        return false;
      }

      if (entry.toolName === "ocr_or_multimodal_extraction_tool" && !uploads.length) {
        return false;
      }

      return true;
    })
    .map((entry) => entry.toolName);

  const riskSummary = await scoreScamRisk({
    normalizedAddress: addressVerification.normalizedAddress,
    borough: addressVerification.borough,
    neighborhood: resolvedNeighborhood.value,
    rent: parsedListing.extractedRent,
    contactRole,
    messageText: input.messageText,
    screenshotText: screenshotExtraction.text,
    rankedFactors,
    unavailableChecks,
  });
  trace.push(createTraceEntry("risk_scoring_tool", "completed", "Generated risk scoring output."));

  const model = getActiveBedrockModel();
  const degradedChecks = buildDegradedChecks({
    messageModelId: messageSignals.modelIdUsed,
    screenshotModelId: screenshotExtraction.modelIdUsed,
    scoringModelId: riskSummary.modelIdUsed,
    uploads,
    hasMessageText: Boolean(input.messageText?.trim()),
    brokerStatus: brokerVerification.status,
  });
  const scopeNotes = uniqueList([
    ...(addressVerification.manhattanOnly
      ? ["This listing resolved within the Manhattan-focused MVP coverage area."]
      : ["This MVP is optimized for Manhattan listings, so non-Manhattan property checks may be less reliable."]),
    ...(uploads.length ? ["Screenshot evidence was included in the analysis workflow."] : []),
    ...(degradedChecks.length
      ? ["Some checks completed with fallback logic rather than fully live provider or model output."]
      : unavailableChecks.length
        ? ["Some verification steps could not run because required evidence was missing or provider coverage was limited."]
      : ["All currently wired checks completed without known fallback behavior."]),
  ]);
  const confidenceNote = buildConfidenceNote({
    unavailableChecks,
    degradedChecks,
    uploads,
    modelIdUsed: riskSummary.modelIdUsed,
  });
  const verifiedFacts = buildVerifiedFacts({
    normalizedAddress: addressVerification.normalizedAddress ?? undefined,
    borough: addressVerification.borough ?? undefined,
    neighborhood: resolvedNeighborhood.value ?? undefined,
    neighborhoodSource: resolvedNeighborhood.source,
    extractedRent: parsedListing.extractedRent,
    brokerName: contactName,
    company: contactCompany,
    contactRole: formatContactRole(contactRole),
    contactEmail,
    contactPhone,
    licenseNumber: contactLicenseNumber,
    uploads,
  });
  const systemNotes = buildSystemNotes({
    messageNotes: messageSignals.notes,
    screenshotNotes: screenshotExtraction.notes,
    scoringNotes: riskSummary.notes,
    addressNotes: addressVerification.notes,
    propertyNotes: propertyContext.notes,
    rentNotes: rentContext.notes,
    brokerNotes: brokerVerification.notes,
  });

  return {
    data: {
      ...mockAnalysisResult,
      id: crypto.randomUUID(),
      extractedFacts: {
        ...mockAnalysisResult.extractedFacts,
        address: parsedListing.address,
        borough: addressVerification.borough ?? mockAnalysisResult.borough,
        neighborhood: resolvedNeighborhood.value ?? mockAnalysisResult.neighborhood,
        claimedRent: parsedListing.extractedRent,
        contactRole,
        brokerName: contactName,
        company: contactCompany,
        contactEmail,
        contactPhone,
        licenseNumber: contactLicenseNumber,
        paymentMethod: messageSignals.paymentMethod,
        urgencySignals: messageSignals.urgencySignals,
        tourLimitations: messageSignals.tourLimitations,
      },
      normalizedAddress: addressVerification.normalizedAddress ?? mockAnalysisResult.normalizedAddress,
      summary: riskSummary.summary,
      confidenceNote:
        strongIdentityContext && !degradedChecks.length && riskSummary.label === "low"
          ? "This estimate includes live checks plus multiple submitted identity details, which improves practical follow-up confidence while still not replacing independent verification."
          : confidenceNote,
      systemNotes,
      rankedFactors: riskSummary.rankedFactors,
      recommendedNextSteps: buildRecommendedNextSteps({
        label: riskSummary.label,
        score: riskSummary.score,
        currentSteps: riskSummary.recommendedNextSteps,
        role: contactRole,
        contactMissing: !brokerVerification.matched,
      }),
      verifiedFacts,
      checksRun: trace.filter((entry) => entry.status === "completed").map((entry) => entry.toolName),
      unavailableChecks: uniqueList([...unavailableChecks, ...degradedChecks]),
      scopeNotes,
      createdAt: new Date().toISOString(),
      score: riskSummary.score,
      label: riskSummary.label,
      borough: addressVerification.borough ?? mockAnalysisResult.borough,
      neighborhood: resolvedNeighborhood.value ?? mockAnalysisResult.neighborhood,
      extractedRent: parsedListing.extractedRent,
      extractedContactRole: contactRole,
      extractedBrokerName: contactName,
      extractedCompany: contactCompany,
      configuredModelId: model.activeModelId,
      modelIdUsed: riskSummary.modelIdUsed,
      unverifiedOrMissing: uniqueList([
        !brokerVerification.matched
          ? contactRole === "broker_agent"
            ? "Broker identity could not be independently confirmed."
            : "Contact identity could not be independently confirmed from the submitted details."
          : "",
        uploads.length && screenshotExtraction.modelIdUsed === "mock-fallback"
          ? "Uploaded screenshots were included, but extracted screenshot text could not be fully confirmed from live multimodal analysis."
          : "",
        "No independently verified unit availability source is connected yet.",
      ]),
    },
    trace,
  };
}

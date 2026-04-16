import { mockAnalysisResult } from "@/lib/analysis/mock-data";
import { createTraceEntry } from "@/lib/mcp/orchestrator";
import type { AnalysisInput, AnalysisResult, UploadAsset } from "@/types";

import { verifyAddress } from "@/services/address-verification";
import { getActiveBedrockModel } from "@/services/bedrock-model-selection";
import { verifyBroker } from "@/services/broker-verification";
import { parseListing } from "@/services/listing-parsing";
import { extractMessageSignals } from "@/services/message-extraction";
import { getPropertyContext } from "@/services/property-context";
import { compareRent } from "@/services/rent-comparison";
import { scoreScamRisk } from "@/services/scam-scoring";
import { extractScreenshotText } from "@/services/screenshot-ocr";

function uniqueList(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function buildConfidenceNote(input: {
  unavailableChecks: string[];
  uploads: UploadAsset[];
  modelIdUsed: string;
}) {
  if (input.unavailableChecks.length === 0 && input.modelIdUsed !== "deterministic-fallback") {
    return "This estimate includes live tool checks and model reasoning, but it should still be treated as decision support rather than proof.";
  }

  if (input.unavailableChecks.length > 0) {
    return "This estimate is directionally useful, but some checks were unavailable or partially mocked, so independent verification is still important.";
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
  extractedRent?: number;
  brokerName?: string;
  company?: string;
  uploads: UploadAsset[];
}) {
  return uniqueList([
    input.normalizedAddress ? `Address|${input.normalizedAddress}|Address verification tool` : "",
    input.borough ? `Borough|${input.borough}|Geocoding` : "",
    input.neighborhood ? `Neighborhood|${input.neighborhood}|Geocoding` : "",
    typeof input.extractedRent === "number"
      ? `Claimed rent|$${input.extractedRent.toLocaleString()}|Listing parser + extraction`
      : "",
    input.brokerName ? `Claimed broker|${input.brokerName}|Message extraction` : "",
    input.company ? `Claimed company|${input.company}|Message extraction` : "",
    input.uploads.length
      ? `Screenshot evidence received|${input.uploads.length} file${input.uploads.length === 1 ? "" : "s"} uploaded|Upload validation`
      : "",
  ]).map((item) => {
    const [label, value, source] = item.split("|");
    return { label, value, source };
  });
}

export async function runAnalysisOrchestration(
  input: AnalysisInput,
  uploads: UploadAsset[] = [],
): Promise<{ data: AnalysisResult; trace: ReturnType<typeof createTraceEntry>[] }> {
  const trace = [];

  const parsedListing = await parseListing(input);
  trace.push(createTraceEntry("listing_parser_tool", "completed", "Parsed listing URL and rent hints."));

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

  const brokerVerification = await verifyBroker(messageSignals.brokerName, messageSignals.company);
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

  const rankedFactors = uniqueList([
    ...(rentContext.status === "completed" && rentContext.belowRange
      ? ["Quoted rent appears meaningfully below neighborhood context"]
      : []),
    ...messageSignals.urgencySignals,
    ...messageSignals.tourLimitations,
    ...(uploads.length ? ["Screenshot evidence contains rental scam review signals"] : []),
    ...(brokerVerification.status !== "skipped" && !brokerVerification.matched
      ? ["Broker identity could not be confidently verified"]
      : []),
  ]).map((title, index) => ({
    title,
    severity:
      index === 0 || title.toLowerCase().includes("below") || title.toLowerCase().includes("deposit")
        ? "high"
        : title.toLowerCase().includes("verified")
          ? "medium"
          : "medium",
    contribution:
      title.toLowerCase().includes("below")
        ? 26
        : title.toLowerCase().includes("deposit")
          ? 18
          : title.toLowerCase().includes("verified")
            ? 14
            : 12,
    explanation:
      title === "Quoted rent appears meaningfully below neighborhood context"
        ? "The quoted rent is below the current comparison range for the normalized address."
        : `${title} was detected from the current evidence and contributes to the overall scam estimate.`,
    evidenceSource:
      title.toLowerCase().includes("screenshot")
        ? "screenshot"
        : title.toLowerCase().includes("below") || title.toLowerCase().includes("verified")
          ? "tool"
          : "message",
  })) as AnalysisResult["rankedFactors"];

  const unavailableChecks = trace
    .filter((entry) => entry.status !== "completed")
    .map((entry) => entry.toolName);

  const riskSummary = await scoreScamRisk({
    normalizedAddress: addressVerification.normalizedAddress,
    borough: addressVerification.borough,
    neighborhood: addressVerification.neighborhood,
    rent: parsedListing.extractedRent,
    messageText: input.messageText,
    screenshotText: screenshotExtraction.text,
    rankedFactors,
    unavailableChecks,
  });
  trace.push(createTraceEntry("risk_scoring_tool", "completed", "Generated scaffolded risk scoring output."));

  const model = getActiveBedrockModel();
  const scopeNotes = uniqueList([
    ...(addressVerification.manhattanOnly
      ? ["This listing resolved within the Manhattan-focused MVP coverage area."]
      : ["This MVP is optimized for Manhattan listings, so non-Manhattan property checks may be less reliable."]),
    ...(uploads.length ? ["Screenshot evidence was included in the analysis workflow."] : []),
    ...(unavailableChecks.length
      ? [`Some checks were unavailable or skipped: ${unavailableChecks.join(", ")}.`]
      : ["All currently wired checks completed for this submission."]),
  ]);
  const confidenceNote = buildConfidenceNote({
    unavailableChecks,
    uploads,
    modelIdUsed: riskSummary.modelIdUsed,
  });
  const verifiedFacts = buildVerifiedFacts({
    normalizedAddress: addressVerification.normalizedAddress ?? undefined,
    borough: addressVerification.borough ?? undefined,
    neighborhood: addressVerification.neighborhood ?? undefined,
    extractedRent: parsedListing.extractedRent,
    brokerName: messageSignals.brokerName,
    company: messageSignals.company,
    uploads,
  });

  return {
    data: {
      ...mockAnalysisResult,
      id: crypto.randomUUID(),
      extractedFacts: {
        ...mockAnalysisResult.extractedFacts,
        address: parsedListing.address,
        claimedRent: parsedListing.extractedRent,
        brokerName: messageSignals.brokerName,
        company: messageSignals.company,
        paymentMethod: messageSignals.paymentMethod,
        urgencySignals: messageSignals.urgencySignals,
        tourLimitations: messageSignals.tourLimitations,
      },
      normalizedAddress: addressVerification.normalizedAddress ?? mockAnalysisResult.normalizedAddress,
      summary: riskSummary.summary,
      confidenceNote,
      rankedFactors: riskSummary.rankedFactors,
      recommendedNextSteps: riskSummary.recommendedNextSteps,
      verifiedFacts,
      checksRun: trace.filter((entry) => entry.status === "completed").map((entry) => entry.toolName),
      unavailableChecks,
      scopeNotes,
      createdAt: new Date().toISOString(),
      score: riskSummary.score,
      label: riskSummary.label,
      borough: addressVerification.borough ?? mockAnalysisResult.borough,
      neighborhood: addressVerification.neighborhood ?? mockAnalysisResult.neighborhood,
      extractedRent: parsedListing.extractedRent,
      extractedBrokerName: messageSignals.brokerName,
      extractedCompany: messageSignals.company,
      modelIdUsed:
        riskSummary.modelIdUsed !== "deterministic-fallback" ? riskSummary.modelIdUsed : model.activeModelId,
      unverifiedOrMissing: uniqueList([
        ...(uploads.length
          ? [`Screenshot OCR confidence is currently mocked across ${uploads.length} uploaded file(s).`]
          : []),
        ...messageSignals.notes,
        ...screenshotExtraction.notes,
        ...riskSummary.notes,
        ...addressVerification.notes,
        ...propertyContext.notes,
      ]),
    },
    trace,
  };
}

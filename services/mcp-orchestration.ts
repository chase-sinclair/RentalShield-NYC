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
      uploads.length ? "Processed screenshot placeholders." : "No screenshots provided.",
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

  const riskSummary = await scoreScamRisk();
  trace.push(createTraceEntry("risk_scoring_tool", "completed", "Generated scaffolded risk scoring output."));

  const model = getActiveBedrockModel();

  return {
    data: {
      ...mockAnalysisResult,
      id: crypto.randomUUID(),
      modelIdUsed: model.activeModelId,
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
      rankedFactors: riskSummary.rankedFactors,
      recommendedNextSteps: riskSummary.recommendedNextSteps,
      checksRun: trace.filter((entry) => entry.status === "completed").map((entry) => entry.toolName),
      unavailableChecks: trace.filter((entry) => entry.status !== "completed").map((entry) => entry.toolName),
      createdAt: new Date().toISOString(),
      unverifiedOrMissing: [
        ...mockAnalysisResult.unverifiedOrMissing,
        ...addressVerification.notes,
        ...propertyContext.notes,
      ].filter(Boolean),
    },
    trace,
  };
}

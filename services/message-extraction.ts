import { invokeBedrockJson } from "@/lib/ai/bedrock";
import {
  buildMessageExtractionPrompt,
  EXTRACTION_SYSTEM_PROMPT,
} from "@/lib/ai/prompts";
import type { ExtractionSignalSet } from "@/lib/analysis/types";
import type { AnalysisInput } from "@/types";

function buildFallbackSignals(raw: string): ExtractionSignalSet {
  const normalized = raw.toLowerCase();
  const urgencySignals = [
    normalized.includes("today") ? "Mentions same-day urgency" : null,
    normalized.includes("immediately") ? "Requests immediate action" : null,
    normalized.includes("deposit") ? "References deposit timing pressure" : null,
    normalized.includes("another renter") ? "References competing renter pressure" : null,
  ].filter(Boolean) as string[];

  const tourLimitations = [
    normalized.includes("can't show") ? "Claims the unit cannot be shown yet" : null,
    normalized.includes("out of town") ? "Says the owner or agent is out of town" : null,
    normalized.includes("before viewing") ? "Suggests action before a formal viewing" : null,
  ].filter(Boolean) as string[];

  return {
    brokerName: raw ? "Daniel M." : undefined,
    company: raw ? "Metro Prime Leasing" : undefined,
    paymentMethod: normalized.includes("zelle")
      ? "Zelle"
      : normalized.includes("venmo")
        ? "Venmo"
        : undefined,
    urgencySignals,
    tourLimitations,
    confidence: raw ? 0.56 : 0.18,
    notes: [
      raw
        ? "Used heuristic extraction fallback because Bedrock extraction was unavailable."
        : "No message text was provided for extraction.",
    ],
    modelIdUsed: "heuristic-fallback",
  };
}

export async function extractMessageSignals(input: Pick<AnalysisInput, "messageText">) {
  const raw = input.messageText ?? "";

  if (!raw.trim()) {
    return buildFallbackSignals(raw);
  }

  try {
    const response = await invokeBedrockJson<ExtractionSignalSet>({
      systemPrompt: EXTRACTION_SYSTEM_PROMPT,
      userPrompt: buildMessageExtractionPrompt(raw),
    });

    return {
      ...response.data,
      urgencySignals: response.data.urgencySignals ?? [],
      tourLimitations: response.data.tourLimitations ?? [],
      notes: response.data.notes ?? [],
      modelIdUsed: response.modelIdUsed,
    };
  } catch {
    return buildFallbackSignals(raw);
  }
}

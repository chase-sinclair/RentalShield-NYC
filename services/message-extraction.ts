import { invokeBedrockJson } from "@/lib/ai/bedrock";
import {
  buildMessageExtractionPrompt,
  EXTRACTION_SYSTEM_PROMPT,
} from "@/lib/ai/prompts";
import type { ExtractionSignalSet } from "@/lib/analysis/types";
import type { AnalysisInput } from "@/types";

function toOptionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function toStringArray(value: unknown) {
  if (Array.isArray(value)) {
    return value
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  if (typeof value === "string" && value.trim()) {
    return [value.trim()];
  }

  return [];
}

function toConfidence(value: unknown, fallback = 0.5) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function sanitizeMessageSignals(signals: ExtractionSignalSet): ExtractionSignalSet {
  const benignPatterns = [
    /specific time window/i,
    /showings? only this week/i,
    /between\s+\d/i,
    /standard application/i,
    /government-issued id/i,
    /proof of income/i,
    /pay stubs?/i,
    /credit check/i,
    /guarantor/i,
    /12 months?/i,
    /move-in/i,
    /broker fees? may apply/i,
  ];

  const isBenign = (value: string) => benignPatterns.some((pattern) => pattern.test(value));

  return {
    ...signals,
    urgencySignals: signals.urgencySignals.filter((signal) => !isBenign(signal)),
    tourLimitations: signals.tourLimitations.filter((signal) => !isBenign(signal)),
  };
}

function normalizeExtractionSignalSet(value: unknown): ExtractionSignalSet {
  const payload = value as Record<string, unknown>;

  return {
    brokerName: toOptionalString(payload.brokerName),
    company: toOptionalString(payload.company),
    paymentMethod: toOptionalString(payload.paymentMethod),
    urgencySignals: toStringArray(payload.urgencySignals),
    tourLimitations: toStringArray(payload.tourLimitations),
    confidence: toConfidence(payload.confidence, 0.62),
    notes: toStringArray(payload.notes),
    modelIdUsed: "pending-bedrock-model",
  };
}

function buildFallbackSignals(raw: string): ExtractionSignalSet {
  return buildFallbackSignalsWithReason(raw);
}

function buildFallbackSignalsWithReason(raw: string, reason?: string): ExtractionSignalSet {
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
        ? [
            "Used heuristic extraction fallback because Bedrock extraction was unavailable.",
            reason ? `Fallback reason: ${reason}` : "",
          ]
            .filter(Boolean)
            .join(" ")
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
    const response = await invokeBedrockJson<unknown>({
      systemPrompt: EXTRACTION_SYSTEM_PROMPT,
      userPrompt: buildMessageExtractionPrompt(raw),
    });
    const normalized = normalizeExtractionSignalSet(response.data);

    return {
      ...sanitizeMessageSignals(normalized),
      modelIdUsed: response.modelIdUsed,
    };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Unknown Bedrock extraction error.";
    console.error("Message extraction Bedrock call failed:", error);
    return buildFallbackSignalsWithReason(raw, reason);
  }
}

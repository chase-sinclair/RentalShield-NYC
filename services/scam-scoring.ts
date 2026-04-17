import { invokeBedrockJson } from "@/lib/ai/bedrock";
import { buildRiskScoringPrompt, RISK_SCORING_SYSTEM_PROMPT } from "@/lib/ai/prompts";
import type { RiskScoringResult } from "@/lib/analysis/types";
import type { RankedFactor, ScamRiskLabel } from "@/types";

function deriveLabel(score: number): ScamRiskLabel {
  if (score >= 67) {
    return "high";
  }

  if (score >= 34) {
    return "medium";
  }

  return "low";
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

function toEvidenceSource(value: unknown, fallback: RankedFactor["evidenceSource"]): RankedFactor["evidenceSource"] {
  if (value === "url" || value === "message" || value === "screenshot" || value === "tool") {
    return value;
  }

  return fallback;
}

function normalizeRankedFactors(
  value: unknown,
  fallbackFactors: RankedFactor[],
): RankedFactor[] {
  if (!Array.isArray(value)) {
    return fallbackFactors;
  }

  const normalized = value
    .map((item) => item as Record<string, unknown>)
    .map((item) => {
      const title =
        (typeof item.title === "string" && item.title.trim()) ||
        (typeof item.factor === "string" && item.factor.trim()) ||
        (typeof item.name === "string" && item.name.trim()) ||
        "";

      if (!title) {
        return null;
      }

      const fallbackMatch = fallbackFactors.find((factor) => factor.title.toLowerCase() === title.toLowerCase());
      if (!fallbackMatch) {
        return null;
      }

      const severity = item.severity === "low" || item.severity === "medium" || item.severity === "high"
        ? item.severity
        : fallbackMatch.severity;
      const contribution =
        typeof item.contribution === "number" && Number.isFinite(item.contribution)
          ? item.contribution
          : fallbackMatch.contribution;
      const explanation =
        (typeof item.explanation === "string" && item.explanation.trim()) ||
        (typeof item.evidence === "string" && item.evidence.trim()) ||
        fallbackMatch.explanation ||
        `${title} contributed to the current scam estimate.`;

      return {
        title,
        severity,
        contribution,
        explanation,
        evidenceSource: toEvidenceSource(item.evidenceSource ?? item.source, fallbackMatch.evidenceSource),
      } satisfies RankedFactor;
    })
    .filter((item): item is RankedFactor => Boolean(item));

  return normalized.length ? normalized : fallbackFactors;
}

function normalizeRiskScoringResult(value: unknown, fallbackFactors: RankedFactor[]): Omit<RiskScoringResult, "modelIdUsed"> {
  const payload = value as Record<string, unknown>;
  const normalizedFactors = normalizeRankedFactors(payload.rankedFactors, fallbackFactors);
  const fallbackScore = fallbackFactors.reduce((total, factor) => total + factor.contribution, 0);
  const scoreFromFactors = normalizedFactors.reduce((total, factor) => total + factor.contribution, 0);
  const score = scoreFromFactors || (typeof payload.score === "number" && Number.isFinite(payload.score) ? payload.score : fallbackScore);
  const label = deriveLabel(score);

  return {
    score,
    label,
    summary:
      (typeof payload.summary === "string" && payload.summary.trim()) ||
      "Model scoring completed, but the summary was returned without a finalized explanation.",
    rankedFactors: normalizedFactors.length ? normalizedFactors : fallbackFactors,
    recommendedNextSteps: toStringArray(payload.recommendedNextSteps),
    notes: toStringArray(payload.notes),
  };
}

export async function scoreScamRisk(input: {
  normalizedAddress?: string;
  borough?: string;
  neighborhood?: string;
  rent?: number;
  messageText?: string;
  screenshotText?: string;
  rankedFactors: RankedFactor[];
  unavailableChecks: string[];
}) {
  const fallbackNextSteps = [
    "Request a verified tour before sending any money.",
    "Verify the broker or landlord identity independently.",
    "Confirm address, lease terms, and payment method through trusted sources.",
  ];

  async function runModelScoring(promptInput: typeof input, maxTokens: number) {
    const response = await invokeBedrockJson<unknown>({
      systemPrompt: RISK_SCORING_SYSTEM_PROMPT,
      userPrompt: buildRiskScoringPrompt(promptInput),
      maxTokens,
    });
    const normalized = normalizeRiskScoringResult(response.data, input.rankedFactors);

    return {
      ...normalized,
      recommendedNextSteps:
        normalized.recommendedNextSteps.length > 0
          ? normalized.recommendedNextSteps
          : fallbackNextSteps,
      modelIdUsed: response.modelIdUsed,
    };
  }

  try {
    return await runModelScoring(input, 2000);
  } catch (error) {
    console.error("Primary risk scoring Bedrock call failed:", error);

    try {
      return await runModelScoring(
        {
          ...input,
          messageText: input.messageText?.slice(0, 1500),
          screenshotText: input.screenshotText?.slice(0, 1000),
          rankedFactors: input.rankedFactors.slice(0, 6),
          unavailableChecks: input.unavailableChecks.slice(0, 4),
        },
        1600,
      );
    } catch (retryError) {
      const reason =
        retryError instanceof Error ? retryError.message : "Unknown Bedrock scoring error.";
      console.error("Retry risk scoring Bedrock call failed:", retryError);

    const score = input.rankedFactors.reduce((total, factor) => total + factor.contribution, 0);

      return {
        score,
        label: deriveLabel(score),
        rankedFactors: input.rankedFactors,
        summary:
          score >= 67
            ? "Multiple high-signal risk factors were identified, so this listing should be treated cautiously."
            : score >= 34
              ? "Some meaningful scam indicators were identified, but several checks still require confirmation."
              : "Only limited scam indicators were identified from the evidence currently available.",
        recommendedNextSteps: fallbackNextSteps,
        notes: [
          "Used deterministic scoring fallback because Bedrock risk scoring was unavailable.",
          `Fallback reason: ${reason}`,
        ],
        modelIdUsed: "deterministic-fallback",
      };
    }
  }
}

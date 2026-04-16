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
  try {
    const response = await invokeBedrockJson<RiskScoringResult>({
      systemPrompt: RISK_SCORING_SYSTEM_PROMPT,
      userPrompt: buildRiskScoringPrompt(input),
      maxTokens: 1200,
    });

    return {
      ...response.data,
      notes: response.data.notes ?? [],
      modelIdUsed: response.modelIdUsed,
    };
  } catch {
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
      recommendedNextSteps: [
        "Request a verified tour before sending any money.",
        "Verify the broker or landlord identity independently.",
        "Confirm address, lease terms, and payment method through trusted sources.",
      ],
      notes: ["Used deterministic scoring fallback because Bedrock risk scoring was unavailable."],
      modelIdUsed: "deterministic-fallback",
    };
  }
}

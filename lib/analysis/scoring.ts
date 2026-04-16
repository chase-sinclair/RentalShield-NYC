import { scoreScamRisk } from "@/services/scam-scoring";
import type { RankedFactor } from "@/types";

export async function calculateRiskScore(input: {
  normalizedAddress?: string;
  borough?: string;
  neighborhood?: string;
  rent?: number;
  messageText?: string;
  screenshotText?: string;
  rankedFactors: RankedFactor[];
  unavailableChecks: string[];
}) {
  return scoreScamRisk(input);
}

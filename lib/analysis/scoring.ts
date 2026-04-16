import { scoreScamRisk } from "@/services/scam-scoring";

export async function calculateRiskScore() {
  return scoreScamRisk();
}

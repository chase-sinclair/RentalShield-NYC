import { mockAnalysisResult } from "@/lib/analysis/mock-data";

export async function scoreScamRisk() {
  // TODO: Replace with explainable Bedrock-assisted scoring that combines tool outputs.
  return {
    score: mockAnalysisResult.score,
    label: mockAnalysisResult.label,
    rankedFactors: mockAnalysisResult.rankedFactors,
    summary: mockAnalysisResult.summary,
    recommendedNextSteps: mockAnalysisResult.recommendedNextSteps,
  };
}

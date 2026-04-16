import type { AnalysisInput, AnalysisResult, StagedUploadAsset } from "@/types";

import { runAnalysisOrchestration } from "@/services/mcp-orchestration";

export async function orchestrateAnalysis(
  input: AnalysisInput,
  uploads: StagedUploadAsset[] = [],
): Promise<AnalysisResult> {
  const { data } = await runAnalysisOrchestration(input, uploads);

  return data;
}

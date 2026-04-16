import type { AnalysisInput, AnalysisResult, UploadAsset } from "@/types";

import { runAnalysisOrchestration } from "@/services/mcp-orchestration";

export async function orchestrateAnalysis(
  input: AnalysisInput,
  uploads: UploadAsset[] = [],
): Promise<AnalysisResult> {
  const { data } = await runAnalysisOrchestration(input, uploads);

  return data;
}

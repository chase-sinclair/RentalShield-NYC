"use server";

import { analyzeInputSchema } from "@/lib/utils/validation";
import type { AnalysisInput } from "@/types";

export async function validateAnalysisInput(input: AnalysisInput) {
  return analyzeInputSchema.safeParse(input);
}

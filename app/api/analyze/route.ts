import { NextResponse } from "next/server";

import { persistAnalysisResult } from "@/lib/analysis/persistence";
import { runAnalysisOrchestration } from "@/services/mcp-orchestration";
import { analyzeInputSchema } from "@/lib/utils/validation";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    listingUrl?: string;
    messageText?: string;
    manualRent?: number;
    screenshotAssets?: {
      id: string;
      name: string;
      contentType: string;
      size: number;
    }[];
  };

  const parsed = analyzeInputSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        errors: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  // Keep route handlers thin; validation and orchestration live in shared modules.
  const { data, trace } = await runAnalysisOrchestration(
    parsed.data,
    parsed.data.screenshotAssets ?? [],
  );
  const persistence = await persistAnalysisResult({
    result: data,
    input: parsed.data,
    trace,
  });

  return NextResponse.json({
    ok: true,
    data,
    trace,
    persistence,
  });
}

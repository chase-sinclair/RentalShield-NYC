import { NextResponse } from "next/server";

import { runAnalysisOrchestration } from "@/services/mcp-orchestration";
import { analyzeInputSchema } from "@/lib/utils/validation";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    listingUrl?: string;
    messageText?: string;
    manualRent?: number;
    screenshotNames?: string[];
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
  const { data, trace } = await runAnalysisOrchestration(parsed.data);

  return NextResponse.json({
    ok: true,
    data,
    trace,
  });
}

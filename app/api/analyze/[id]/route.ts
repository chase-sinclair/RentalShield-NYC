import { NextResponse } from "next/server";

import { getPersistedAnalysisResult } from "@/lib/analysis/persistence";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_: Request, context: RouteContext) {
  const { id } = await context.params;
  const result = await getPersistedAnalysisResult(id);

  if (!result) {
    return NextResponse.json(
      {
        ok: false,
        error: "Analysis result was not found in persistent storage.",
      },
      { status: 404 },
    );
  }

  return NextResponse.json({
    ok: true,
    data: result,
  });
}

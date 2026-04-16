import { NextResponse } from "next/server";

import { getActiveBedrockModel } from "@/services/bedrock-model-selection";

export async function GET() {
  const model = getActiveBedrockModel();

  return NextResponse.json({
    ok: true,
    app: "RentalShield NYC",
    status: "ready-for-scaffold",
    bedrockModel: model.activeModelId,
  });
}

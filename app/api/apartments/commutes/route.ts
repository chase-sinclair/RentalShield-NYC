import { NextResponse } from "next/server";

import { resolveAddress } from "@/lib/apartments/address";
import { commuteSchema, createCommuteService, DepartureError } from "@/lib/apartments/commutes";
import { createGoogleRouter } from "@/lib/apartments/routing";
import { routesConfig } from "@/lib/apartments/routes-config";

const noStore = { "Cache-Control": "private, no-store" };
const config = routesConfig();
const provider = config ? createGoogleRouter(config) : undefined;
const calculate = createCommuteService({ resolve: resolveAddress, provider });

export async function POST(request: Request) {
  const body = commuteSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: "Choose up to two confirmed NYC apartments and up to three destination addresses." },
      { status: 400, headers: noStore });
  }
  try {
    const result = await calculate(body.data);
    const headers = result.overall === "throttled" ? { ...noStore, "Retry-After": "60" } : noStore;
    return NextResponse.json(result, { status: result.overall === "throttled" ? 429 : 200, headers });
  } catch (error) {
    const validation = error instanceof DepartureError;
    return NextResponse.json({ error: validation ? error.message : "Route calculation is temporarily unavailable. Try again." },
      { status: validation ? 400 : 503, headers: noStore });
  }
}

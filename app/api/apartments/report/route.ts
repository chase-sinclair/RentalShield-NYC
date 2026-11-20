import { NextResponse } from "next/server";
import { z } from "zod";

import { slots } from "@/lib/apartments/contracts";
import { getReports } from "@/lib/apartments/report";

const schema = z.object({
  addresses: z.array(z.object({ slot: z.enum(slots), input: z.unknown() })).min(1).max(2),
}).refine(({ addresses }) =>
  new Set(addresses.map(({ slot }) => slot)).size === addresses.length &&
  (addresses.length === 1 || addresses.every(({ slot }) => slot !== "research")));

const noStore = { "Cache-Control": "no-store" };

export async function POST(request: Request) {
  const body = schema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: "Submit one research address or up to two apartment slots." }, { status: 400, headers: noStore });
  }
  return NextResponse.json(await getReports(body.data.addresses), { headers: noStore });
}

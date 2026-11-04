import { NextResponse } from "next/server";
import { z } from "zod";

import { isLikelyUrl } from "@/lib/utils/urls";
import { preflightListingAddress } from "@/services/listing-parsing";
import type { AddressPreflightResponse } from "@/types";

const preflightInputSchema = z
  .object({
    listingUrl: z.string().trim().optional(),
    manualAddress: z.string().trim().optional(),
    messageText: z.string().trim().optional(),
    manualRent: z.number().nonnegative().optional(),
    contactRole: z.enum(["broker_agent", "owner", "property_manager", "leasing_office", "unknown"]).optional(),
    contactName: z.string().trim().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.listingUrl && !isLikelyUrl(value.listingUrl)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Listing URL must be a valid http or https URL.",
        path: ["listingUrl"],
      });
    }

    if (value.contactName && !value.contactRole) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Choose the contact role when you provide contact identity details.",
        path: ["contactRole"],
      });
    }
  });

export async function POST(request: Request) {
  const body = (await request.json()) as {
    listingUrl?: string;
    manualAddress?: string;
    messageText?: string;
    manualRent?: number;
    contactRole?: "broker_agent" | "owner" | "property_manager" | "leasing_office" | "unknown";
    contactName?: string;
  };

  const parsed = preflightInputSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        errors: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const result = await preflightListingAddress(parsed.data);

  return NextResponse.json({
    ok: true,
    ...result,
  } satisfies AddressPreflightResponse);
}

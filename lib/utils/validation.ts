import { z } from "zod";

import { serverEnv } from "@/lib/config/env";
import { isLikelyUrl } from "@/lib/utils/urls";

export const uploadSchema = z.object({
  name: z.string().min(1),
  contentType: z.string().startsWith("image/"),
  size: z.number().max(serverEnv.maxUploadFileSizeMb * 1024 * 1024),
});

export const analyzeInputSchema = z
  .object({
    listingUrl: z.string().trim().optional(),
    messageText: z.string().trim().optional(),
    manualRent: z
      .union([z.number().nonnegative(), z.nan()])
      .optional()
      .transform((value) => (Number.isNaN(value) ? undefined : value)),
    screenshotNames: z.array(z.string()).max(serverEnv.maxUploadFileCount).optional(),
  })
  .superRefine((value, ctx) => {
    const hasUrl = Boolean(value.listingUrl);
    const hasMessage = Boolean(value.messageText);
    const hasShots = Boolean(value.screenshotNames?.length);

    if (!(hasUrl || hasMessage || hasShots)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Provide a listing URL, message text, or screenshots to start an analysis.",
      });
    }

    if (value.listingUrl && !isLikelyUrl(value.listingUrl)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Listing URL must be a valid http or https URL.",
        path: ["listingUrl"],
      });
    }
  });

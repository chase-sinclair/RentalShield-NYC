import { geocodeAddress } from "@/lib/integrations/google-maps";

export async function verifyAddress(address?: string) {
  if (!address) {
    return {
      normalizedAddress: undefined,
      manhattanOnly: false,
      status: "skipped" as const,
      notes: ["No address was available to verify."],
    };
  }

  const result = await geocodeAddress(address);

  return {
    ...result,
    status: "completed" as const,
    notes: result.manhattanOnly
      ? []
      : ["This MVP is optimized for Manhattan listings; some checks may be limited."],
  };
}

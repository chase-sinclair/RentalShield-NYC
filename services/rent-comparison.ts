import { getRentEstimateContext } from "@/lib/integrations/rentcast";

export async function compareRent(address?: string, claimedRent?: number) {
  if (!address || typeof claimedRent !== "number") {
    return {
      status: "skipped" as const,
      notes: ["Need both an address and rent amount to compare pricing context."],
    };
  }

  const context = await getRentEstimateContext(address);
  const belowRange = claimedRent < context.typicalRangeLow;

  return {
    status: "completed" as const,
    source: context.source,
    belowRange,
    typicalRangeLow: context.typicalRangeLow,
    typicalRangeHigh: context.typicalRangeHigh,
    claimedRent,
    notes: [
      ...(belowRange ? ["Claimed rent is below the current estimated range for this area."] : []),
      ...(context.notes ?? []),
    ],
  };
}

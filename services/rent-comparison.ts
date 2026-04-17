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
  const percentageBelowRange = belowRange
    ? Math.max(0, (context.typicalRangeLow - claimedRent) / context.typicalRangeLow)
    : 0;
  const severity =
    percentageBelowRange >= 0.18 ? "high" : percentageBelowRange >= 0.08 ? "medium" : belowRange ? "low" : "none";
  const contribution = severity === "high" ? 26 : severity === "medium" ? 18 : severity === "low" ? 10 : 0;

  return {
    status: "completed" as const,
    source: context.source,
    belowRange,
    severity,
    contribution,
    percentageBelowRange,
    typicalRangeLow: context.typicalRangeLow,
    typicalRangeHigh: context.typicalRangeHigh,
    claimedRent,
    notes: [
      ...(belowRange
        ? [
            severity === "high"
              ? "Claimed rent is materially below the current estimated range for this area."
              : severity === "medium"
                ? "Claimed rent is somewhat below the current estimated range for this area."
                : "Claimed rent is slightly below the current estimated range for this area."
          ]
        : []),
      ...(context.notes ?? []),
    ],
  };
}

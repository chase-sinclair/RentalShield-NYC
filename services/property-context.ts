export async function getPropertyContext(address?: string) {
  // TODO: Expand with NYC open datasets and building-level plausibility signals.
  const inManhattan = address?.toLowerCase().includes("new york") || address?.toLowerCase().includes("manhattan");

  return {
    address,
    buildingType: address ? "Pre-war apartment building" : undefined,
    plausibility: address ? "Likely residential building" : "Unavailable",
    notes: address
      ? inManhattan
        ? ["Property context is currently tuned for Manhattan-oriented listing review."]
        : ["Property context is available, but this MVP is optimized for Manhattan addresses."]
      : ["No address available for property context."],
  };
}

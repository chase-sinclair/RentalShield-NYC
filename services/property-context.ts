export async function getPropertyContext(address?: string) {
  // TODO: Add Manhattan-oriented property plausibility checks with public datasets.
  return {
    address,
    buildingType: address ? "Pre-war apartment building" : undefined,
    plausibility: address ? "Likely residential building" : "Unavailable",
    notes: address ? [] : ["No address available for property context."],
  };
}

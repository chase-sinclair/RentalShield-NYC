import { serverEnv } from "@/lib/config/env";

export async function getRentEstimateContext(address: string) {
  // TODO: Replace mock response with RentCast request using serverEnv.rentcastApiKey.
  return {
    address,
    typicalRangeLow: 3200,
    typicalRangeHigh: 4600,
    confidence: 0.57,
    source: serverEnv.rentcastApiKey ? "rentcast-pending" : "mock",
  };
}

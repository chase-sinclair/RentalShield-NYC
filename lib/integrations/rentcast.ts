import { serverEnv } from "@/lib/config/env";

export async function getRentEstimateContext(address: string) {
  if (!serverEnv.rentcastApiKey) {
    return {
      address,
      typicalRangeLow: 3200,
      typicalRangeHigh: 4600,
      confidence: 0.57,
      source: "mock",
      notes: ["RentCast API key is not configured; using mock rent context fallback."],
    };
  }

  try {
    const params = new URLSearchParams({
      address,
    });

    const response = await fetch(`https://api.rentcast.io/v1/avm/rent/long-term?${params.toString()}`, {
      method: "GET",
      headers: {
        "X-Api-Key": serverEnv.rentcastApiKey,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(8000),
      next: { revalidate: 0 },
    });

    if (!response.ok) {
      throw new Error(`RentCast request failed with status ${response.status}`);
    }

    const payload = (await response.json()) as {
      rent?: number;
      priceRangeLow?: number;
      priceRangeHigh?: number;
      confidence?: number;
    };

    const low = payload.priceRangeLow ?? (payload.rent ? Math.round(payload.rent * 0.88) : 3200);
    const high = payload.priceRangeHigh ?? (payload.rent ? Math.round(payload.rent * 1.12) : 4600);

    return {
      address,
      typicalRangeLow: low,
      typicalRangeHigh: high,
      confidence: payload.confidence ?? 0.72,
      source: "rentcast-live",
      notes: [],
    };
  } catch (error) {
    return {
      address,
      typicalRangeLow: 3200,
      typicalRangeHigh: 4600,
      confidence: 0.57,
      source: "rentcast-fallback",
      notes: [
        error instanceof Error
          ? `RentCast fallback used: ${error.message}`
          : "RentCast fallback used because the live request failed.",
      ],
    };
  }
}

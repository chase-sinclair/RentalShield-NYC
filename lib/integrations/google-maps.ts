import { serverEnv } from "@/lib/config/env";

export async function geocodeAddress(address: string) {
  // TODO: Connect to Google Maps Geocoding with serverEnv.googleMapsApiKey.
  return {
    requestedAddress: address,
    normalizedAddress: address,
    confidence: 0.68,
    borough: "Manhattan",
    neighborhood: "Upper West Side",
    manhattanOnly: true,
    source: serverEnv.googleMapsApiKey ? "google-maps-pending" : "mock",
  };
}

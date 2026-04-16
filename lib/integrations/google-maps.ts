import { serverEnv } from "@/lib/config/env";

function getAddressComponent(
  components: { long_name: string; short_name: string; types: string[] }[],
  type: string,
) {
  return components.find((component) => component.types.includes(type));
}

function inferNeighborhood(
  components: { long_name: string; short_name: string; types: string[] }[],
) {
  return (
    getAddressComponent(components, "neighborhood")?.long_name ??
    getAddressComponent(components, "sublocality")?.long_name ??
    getAddressComponent(components, "sublocality_level_1")?.long_name
  );
}

export async function geocodeAddress(address: string) {
  if (!serverEnv.googleMapsApiKey) {
    return {
      requestedAddress: address,
      normalizedAddress: address,
      confidence: 0.68,
      borough: "Manhattan",
      neighborhood: "Upper West Side",
      manhattanOnly: true,
      source: "mock",
      notes: ["Google Maps API key is not configured; using mock geocoding fallback."],
    };
  }

  try {
    const params = new URLSearchParams({
      address,
      key: serverEnv.googleMapsApiKey,
      components: "country:US|administrative_area:NY",
    });

    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?${params.toString()}`,
      {
        method: "GET",
        signal: AbortSignal.timeout(8000),
        next: { revalidate: 0 },
      },
    );

    if (!response.ok) {
      throw new Error(`Google Maps geocoding failed with status ${response.status}`);
    }

    const payload = (await response.json()) as {
      status: string;
      results?: {
        formatted_address: string;
        partial_match?: boolean;
        address_components: { long_name: string; short_name: string; types: string[] }[];
      }[];
    };

    const result = payload.results?.[0];

    if (!result) {
      throw new Error(`Google Maps returned no geocoding results (${payload.status}).`);
    }

    const boroughComponent =
      getAddressComponent(result.address_components, "sublocality_level_1") ??
      getAddressComponent(result.address_components, "administrative_area_level_2");
    const borough = boroughComponent?.long_name?.replace(" County", "");
    const neighborhood = inferNeighborhood(result.address_components);
    const county = getAddressComponent(result.address_components, "administrative_area_level_2")?.long_name;
    const manhattanOnly = borough === "Manhattan" || county === "New York County";

    return {
      requestedAddress: address,
      normalizedAddress: result.formatted_address,
      confidence: result.partial_match ? 0.6 : 0.93,
      borough: borough ?? undefined,
      neighborhood: neighborhood ?? undefined,
      manhattanOnly,
      source: "google-maps-live",
      notes: manhattanOnly
        ? []
        : ["Resolved address appears to be outside Manhattan, so some address/property checks may be limited."],
    };
  } catch (error) {
    return {
      requestedAddress: address,
      normalizedAddress: address,
      confidence: 0.52,
      borough: undefined,
      neighborhood: undefined,
      manhattanOnly: false,
      source: "google-maps-fallback",
      notes: [
        error instanceof Error
          ? `Google Maps geocoding fallback used: ${error.message}`
          : "Google Maps geocoding fallback used because the live request failed.",
      ],
    };
  }
}

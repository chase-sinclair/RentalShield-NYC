import { z } from "zod";

import type { ApartmentAddress, Destination, RouteAssumptions, RouteResult, TravelMode } from "./contracts";

const routesUrl = "https://routes.googleapis.com/directions/v2:computeRoutes";
const fields = "routes.duration,routes.distanceMeters";
const transitFields = [
  "routes.legs.steps.travelMode",
  "routes.legs.steps.transitDetails.transitLine.nameShort",
  "routes.legs.steps.transitDetails.transitLine.name",
  "routes.legs.steps.transitDetails.transitLine.vehicle.type",
].join(",");

type RouteDetails = Omit<Extract<RouteResult, { status: "available" }>, "originKey" | "destination" | "assumptions" | "provenance" | "retrievedAt">;
type RouteError = Pick<Exclude<RouteResult, { status: "available" }>, "status" | "reason">;
export type RouteOutcome = RouteDetails | RouteError;

const providerResponse = z.object({ routes: z.array(z.unknown()).optional() }).strict();
const routeSchema = z.object({
  duration: z.string().regex(/^\d+(\.\d{1,9})?s$/),
  distanceMeters: z.number().int().nonnegative().optional(),
  legs: z.unknown().optional(),
});
const stepsSchema = z.array(z.object({
  steps: z.array(z.object({
    travelMode: z.string().optional(),
    transitDetails: z.object({
      transitLine: z.object({
        name: z.string().optional(),
        nameShort: z.string().optional(),
        vehicle: z.object({ type: z.string().optional() }).optional(),
      }).optional(),
    }).optional(),
  })).optional(),
}));

const sourceError = { status: "unavailable", reason: "Google Routes could not calculate this estimate. Try again or open directions." } as const;
const quotaError = { status: "throttled", reason: "Google Routes is at its request limit. Try again later or open directions." } as const;
const timeoutError = { status: "timeout", reason: "The route request timed out. Try again or open directions." } as const;
const noRoute = { status: "no-route", reason: "Google Routes found no route for this mode and departure. Try another setting or open directions." } as const;

function transitSummary(legs: unknown) {
  const parsed = stepsSchema.safeParse(legs);
  if (!parsed.success) return undefined;
  const modes = parsed.data.flatMap((leg) => leg.steps ?? []).map((step) => {
    if (step.travelMode === "WALK") return "Walk";
    const line = step.transitDetails?.transitLine;
    const label = line?.nameShort || line?.name || line?.vehicle?.type?.replaceAll("_", " ").toLowerCase();
    return label?.trim().slice(0, 60) || (step.travelMode === "TRANSIT" ? "Transit" : undefined);
  }).filter((mode): mode is string => Boolean(mode));
  return modes.filter((mode, index) => index === 0 || modes[index - 1] !== mode).slice(0, 10);
}

export function parseGoogleRoute(payload: unknown, mode: TravelMode): RouteOutcome {
  const response = providerResponse.safeParse(payload);
  if (!response.success) return sourceError;
  const first = response.data.routes?.[0];
  if (first === undefined) return noRoute;
  const parsed = routeSchema.safeParse(first);
  if (!parsed.success) return sourceError;
  const seconds = Number(parsed.data.duration.slice(0, -1));
  if (!Number.isFinite(seconds) || seconds > Number.MAX_SAFE_INTEGER / 7) return sourceError;
  return {
    status: "available", seconds,
    distanceMeters: parsed.data.distanceMeters,
    lines: mode === "transit" ? transitSummary(parsed.data.legs) : undefined,
  };
}

type RouteEvent = {
  event: "google_routes";
  mode: TravelMode;
  status: RouteOutcome["status"];
  elapsedMs: number;
  calls: 1;
};

interface RouterOptions {
  apiKey: string;
  fetcher?: typeof fetch;
  timeoutMs?: number;
  log?: (event: RouteEvent) => void;
}

export function createGoogleRouter({
  apiKey, fetcher = fetch, timeoutMs = 7000, log = (event) => console.info(JSON.stringify(event)),
}: RouterOptions) {
  return async function route(address: ApartmentAddress, destination: Destination, assumptions: RouteAssumptions): Promise<RouteOutcome> {
    const started = Date.now();
    let outcome: RouteOutcome;
    const signal = AbortSignal.timeout(timeoutMs);
    const transit = assumptions.mode === "transit";
    try {
      const response = await fetcher(routesUrl, {
        method: "POST",
        cache: "no-store",
        signal,
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask": transit ? fields + "," + transitFields : fields,
        },
        body: JSON.stringify({
          origin: { location: { latLng: { latitude: address.latitude, longitude: address.longitude } } },
          destination: { address: destination.address },
          travelMode: transit ? "TRANSIT" : "WALK",
          ...(transit ? { departureTime: assumptions.departure } : {}),
        }),
      });
      if (response.status === 429) outcome = quotaError;
      else if (!response.ok) outcome = sourceError;
      else outcome = parseGoogleRoute(await response.json(), assumptions.mode);
    } catch {
      outcome = signal.aborted ? timeoutError : sourceError;
    }
    // Operational fields only. Even upstream exceptions can contain full request payloads.
    log({ event: "google_routes", mode: assumptions.mode, status: outcome.status, elapsedMs: Date.now() - started, calls: 1 });
    return outcome;
  };
}

export type GoogleRouter = ReturnType<typeof createGoogleRouter>;

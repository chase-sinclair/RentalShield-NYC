import { z } from "zod";

import { addressInputSchema, insideNYCPoint } from "./address";
import { parseNYDeparture, validDeparture } from "./calendar";
import {
  boroughs, destinationIds, isDestinationAddress, routeOriginKey, slots,
  type AddressInput, type ApartmentAddress, type CommuteResponse, type Destination, type Resolution,
  type RouteAssumptions, type RouteFailure, type RouteResult,
} from "./contracts";
import type { GoogleRouter } from "./routing";

const unique = (items: string[]) => new Set(items).size === items.length;
const originSchema = z.object({
  slot: z.enum(slots),
  address: addressInputSchema.required({ selection: true }),
  key: z.string().min(1).max(510),
});
export const commuteSchema = z.object({
  session: z.string().uuid(),
  origins: z.array(originSchema).min(1).max(2),
  destinations: z.array(z.object({
    id: z.enum(destinationIds),
    address: z.string().trim().max(200).refine(isDestinationAddress),
  })).min(1).max(3),
  mode: z.enum(["transit", "walking"]),
  departureLocal: z.string().max(16).optional(),
}).refine(({ origins, destinations }) =>
  unique(origins.map(({ slot }) => slot)) && unique(destinations.map(({ id }) => id)) &&
  (origins.length === 1 || origins.every(({ slot }) => slot !== "research")));

export type CommuteRequest = z.infer<typeof commuteSchema>;

type LimitOptions = { sessionLimit: number; instanceLimit: number; activeLimit: number; windowMs: number };
const defaultLimits: LimitOptions = { sessionLimit: 4, instanceLimit: 30, activeLimit: 8, windowMs: 60_000 };

interface CommuteServiceOptions {
  resolve: (input: AddressInput) => Promise<Resolution>;
  provider?: GoogleRouter;
  clock?: () => Date;
  limits?: LimitOptions;
}

function failure(originKey: string, destination: Destination, assumptions: RouteAssumptions, status: RouteFailure, reason: string): RouteResult {
  return { originKey, destination, assumptions, status, reason, provenance: "live" };
}

function totalFailure(request: CommuteRequest, assumptions: RouteAssumptions, status: "disabled" | "throttled", reason: string) {
  return {
    overall: status, assumptions,
    results: request.origins.flatMap(({ key }) => request.destinations.map((destination) =>
      failure(key, destination, assumptions, status, reason))),
  } satisfies CommuteResponse;
}

export class DepartureError extends Error {}

export function createCommuteService({ resolve, provider, clock = () => new Date(), limits = defaultLimits }: CommuteServiceOptions) {
  const inFlight = new Map<string, Promise<CommuteResponse>>();
  const counters = new Map<string, number>();
  let resetAt = 0;
  let count = 0;

  function admit(session: string, now: number) {
    if (now >= resetAt) {
      counters.clear();
      count = 0;
      resetAt = now + limits.windowMs;
    }
    const sessionsUsed = counters.get(session) ?? 0;
    if (sessionsUsed >= limits.sessionLimit || count >= limits.instanceLimit || inFlight.size >= limits.activeLimit) return false;
    counters.set(session, sessionsUsed + 1);
    count++;
    return true;
  }

  async function validatedOrigin(origin: CommuteRequest["origins"][number]): Promise<ApartmentAddress | null> {
    const resolution = await resolve(origin.address);
    if (resolution.status !== "confirmed") return null;
    const address = resolution.address;
    return boroughs.includes(address.borough) && insideNYCPoint(address.latitude, address.longitude) &&
      address.key === origin.address.selection && origin.key === routeOriginKey(address) ? address : null;
  }

  async function run(request: CommuteRequest, assumptions: RouteAssumptions, provider: GoogleRouter): Promise<CommuteResponse> {
    const resolved = await Promise.all(request.origins.map(validatedOrigin));
    const jobs = request.origins.flatMap((origin, index) =>
      request.destinations.map((destination) => ({ origin, address: resolved[index], destination })));
    const results: RouteResult[] = [];
    const pairs = new Map<string, Promise<RouteResult>>();

    // Keep each submission at one attempt per distinct pair and at most three in flight.
    for (let i = 0; i < jobs.length; i += 3) {
      const batch = jobs.slice(i, i + 3).map(({ origin, address, destination }) => {
        if (!address) return failure(origin.key, destination, assumptions, "invalid-origin",
          "Confirm the apartment address in the five boroughs again before calculating.");
        const key = JSON.stringify([origin.key, destination.id]);
        const existing = pairs.get(key);
        if (existing) return existing;
        const result = provider(address, destination, assumptions).then((outcome): RouteResult => ({
          ...outcome, originKey: origin.key, destination, assumptions, provenance: "live",
          retrievedAt: clock().toISOString(),
        }));
        pairs.set(key, result);
        return result;
      });
      results.push(...await Promise.all(batch));
    }
    return { overall: "complete", assumptions, results };
  }

  return async function calculate(request: CommuteRequest): Promise<CommuteResponse> {
    const now = clock();
    const departure = request.mode === "transit" ? parseNYDeparture(request.departureLocal ?? "") : undefined;
    if (request.mode === "transit" && (!departure || !validDeparture(departure, now))) {
      throw new DepartureError("Choose an unambiguous New York departure within the next 14 days.");
    }
    const assumptions: RouteAssumptions = { mode: request.mode, departure: departure ?? undefined };
    if (!provider) {
      return totalFailure(request, assumptions, "disabled", "In-app routing is disabled. Open directions in Google Maps.");
    }
    const fingerprint = JSON.stringify(request);
    const duplicate = inFlight.get(fingerprint);
    if (duplicate) return duplicate;
    if (!admit(request.session, now.getTime())) {
      console.info(JSON.stringify({ event: "google_routes_submission", mode: assumptions.mode, status: "throttled", calls: 0 }));
      return totalFailure(request, assumptions, "throttled", "Too many route calculations. Wait a minute and try again.");
    }
    const calculation = run(request, assumptions, provider).finally(() => inFlight.delete(fingerprint));
    inFlight.set(fingerprint, calculation);
    return calculation;
  };
}

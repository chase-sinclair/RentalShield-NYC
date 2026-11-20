import assert from "node:assert/strict";
import test from "node:test";

import {
  commuteSchema, createCommuteService, DepartureError, type CommuteRequest,
} from "../../lib/apartments/commutes";
import { confirmedInput, routeOriginKey, type ApartmentAddress, type Resolution } from "../../lib/apartments/contracts";
import { createGoogleRouter, parseGoogleRoute } from "../../lib/apartments/routing";

const now = new Date("2026-11-20T18:00:00.000Z");
const a: ApartmentAddress = {
  key: "fixture-a", street: "12 Lantern Row", borough: "Manhattan", zip: "10001",
  latitude: 40.744, longitude: -73.996,
};
const b: ApartmentAddress = {
  key: "fixture-b", street: "42 Juniper Walk", borough: "Brooklyn", zip: "11217",
  latitude: 40.688, longitude: -73.98,
};
const key = "fixture-restricted-test-key";
const origins: CommuteRequest["origins"] = ([["a", a], ["b", b]] as const).map(([slot, address]) => ({
  slot, address: { ...confirmedInput(address), selection: address.key }, key: routeOriginKey(address),
}));
const request: CommuteRequest = {
  session: "336dd309-cb16-4e97-8be2-b45aa1f72150",
  mode: "transit",
  departureLocal: "2026-11-23T08:30",
  origins,
  destinations: [
    { id: "work", address: "1 Hudson Place, Hoboken, NJ" },
    { id: "gym", address: "5 Fixture Street, New York, NY" },
    { id: "friends", address: "98 Sample Avenue, 11201" },
  ],
};
const resolve = async ({ selection }: { selection?: string }): Promise<Resolution> =>
  ({ status: "confirmed", address: selection === a.key ? a : b });

test("routes validate the request and preserve an outside-city waypoint for both origins", async () => {
  const requests: { url: string; options?: RequestInit }[] = [];
  const provider = createGoogleRouter({
    apiKey: key,
    log: () => {},
    fetcher: async (url, options) => {
      requests.push({ url: String(url), options });
      return Response.json({
        routes: [{
          duration: "1740s",
          distanceMeters: 5678,
          legs: [{ steps: [{ travelMode: "WALK" }, { travelMode: "TRANSIT", transitDetails: { transitLine: { nameShort: "PATH" } } }] }],
        }],
      });
    },
  });
  assert.ok(commuteSchema.safeParse(request).success);
  assert.equal(commuteSchema.safeParse({ ...request, origins: [...origins, origins[0]] }).success, false);
  assert.equal(commuteSchema.safeParse({ ...request, destinations: [request.destinations[0], request.destinations[0]] }).success, false);
  assert.equal(commuteSchema.safeParse({ ...request, destinations: [{ id: "work", address: "Hoboken" }] }).success, false);
  const service = createCommuteService({ resolve, provider, clock: () => now });
  const response = await service(request);
  assert.equal(response.results.length, 6);
  assert.equal(requests.length, 6);
  const selected = requests.map(({ url, options }) => {
    assert.equal(url, "https://routes.googleapis.com/directions/v2:computeRoutes");
    assert.equal(options?.method, "POST");
    assert.equal(options?.cache, "no-store");
    const headers = new Headers(options?.headers);
    assert.equal(headers.get("X-Goog-Api-Key"), key);
    assert.match(headers.get("X-Goog-FieldMask")!, /routes\.duration/);
    assert.match(headers.get("X-Goog-FieldMask")!, /transitLine/);
    assert.ok(!headers.get("X-Goog-FieldMask")!.includes("*"));
    return JSON.parse(String(options?.body));
  });
  const work = selected.filter((sent) => sent.destination.address.includes("Hoboken"));
  assert.equal(work.length, 2);
  assert.deepEqual(work[0].destination, work[1].destination);
  assert.notDeepEqual(work[0].origin, work[1].origin);
  for (const body of work) {
    assert.equal(body.travelMode, "TRANSIT");
    assert.equal(body.departureTime, "2026-11-23T13:30:00.000Z");
  }
  assert.equal(response.results[0].status, "available");
  if (response.results[0].status === "available") assert.deepEqual(response.results[0].lines, ["Walk", "PATH"]);
});

test("walking omits departure and rejects obsolete or outside-city origins without losing the other pair", async () => {
  const outside = { ...b, longitude: -75.12 };
  const sent: string[] = [];
  const provider = createGoogleRouter({
    apiKey: key,
    log: () => {},
    fetcher: async (_, options) => {
      assert.equal(new Headers(options?.headers).get("X-Goog-FieldMask"), "routes.duration,routes.distanceMeters");
      sent.push(String(options?.body));
      return Response.json({ routes: [{ duration: "3599.5s" }] });
    },
  });
  const service = createCommuteService({
    resolve: async (input) => ({ status: "confirmed", address: input.selection === a.key ? a : outside }),
    provider, clock: () => now,
  });
  const walking = await service({
    ...request, mode: "walking", departureLocal: "not used", destinations: [request.destinations[0]],
  });
  assert.deepEqual(walking.assumptions, { mode: "walking", departure: undefined });
  assert.equal(sent.length, 1);
  assert.equal(JSON.parse(sent[0]).travelMode, "WALK");
  assert.ok(!Object.hasOwn(JSON.parse(sent[0]), "departureTime"));
  assert.equal(walking.results[0].status, "available");
  if (walking.results[0].status === "available") assert.equal(walking.results[0].seconds, 3599.5);
  assert.equal(walking.results[1].status, "invalid-origin");
  await assert.rejects(service({ ...request, departureLocal: "2026-12-24T08:30" }), DepartureError);
});

test("a disabled adapter produces a fallback for every pair without external calls", async () => {
  const service = createCommuteService({ resolve: async () => { throw Error("unexpected provider lookup"); }, clock: () => now });
  const disabled = await service(request);
  assert.equal(disabled.overall, "disabled");
  assert.equal(disabled.results.length, 6);
  assert.ok(disabled.results.every((item) => item.status === "disabled" && item.reason.includes("Open directions")));
});

test("identical concurrent submits coalesce and subsequent requests are throttled without retries", async () => {
  let calls = 0;
  const service = createCommuteService({
    resolve,
    clock: () => now,
    limits: { sessionLimit: 1, instanceLimit: 2, activeLimit: 2, windowMs: 60_000 },
    provider: createGoogleRouter({
      apiKey: key, log: () => {},
      fetcher: async () => {
        calls++;
        return new Response(null, { status: 429 });
      },
    }),
  });
  const [first, duplicate] = await Promise.all([service(request), service(request)]);
  assert.deepEqual(first, duplicate);
  assert.equal(calls, 6);
  assert.ok(first.results.every((result) => result.status === "throttled"));
  assert.equal((await service(request)).overall, "throttled");
  assert.equal(calls, 6);
});

test("returns per-pair no-route, quota, timeout, and provider errors with redacted telemetry", async () => {
  assert.equal(parseGoogleRoute({}, "transit").status, "no-route");
  assert.equal(parseGoogleRoute({ routes: [] }, "transit").status, "no-route");
  assert.equal(parseGoogleRoute({ routes: [{ duration: null }] }, "transit").status, "unavailable");
  assert.equal(parseGoogleRoute({ error: "bad payload" }, "walking").status, "unavailable");

  const logs: unknown[] = [];
  const destination = request.destinations[0];
  const assumptions = { mode: "transit", departure: "2026-11-23T13:30:00.000Z" } as const;
  const provider = createGoogleRouter({
    apiKey: key, log: (event) => logs.push(event), timeoutMs: 5,
    fetcher: async (_, options) => {
      await new Promise((done) => setTimeout(done, 15));
      assert.ok(options?.signal?.aborted);
      throw new Error(key + " " + destination.address + " raw provider response");
    },
  });
  assert.equal((await provider(a, destination, assumptions)).status, "timeout");
  const denied = createGoogleRouter({
    apiKey: key, log: (event) => logs.push(event),
    fetcher: async () => Response.json({ error: key + " " + destination.address }, { status: 403 }),
  });
  assert.equal((await denied(a, destination, assumptions)).status, "unavailable");
  assert.equal(logs.length, 2);
  for (const line of logs) assert.deepEqual(Object.keys(line as object).sort(), ["calls", "elapsedMs", "event", "mode", "status"]);
  assert.ok(!JSON.stringify(logs).includes(key));
  assert.ok(!JSON.stringify(logs).includes(destination.address));
});

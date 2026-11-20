"use client";

import { useEffect, useRef, useState } from "react";

import { nextWeekdayDeparture, parseNYDeparture, validDeparture } from "@/lib/apartments/calendar";
import {
  confirmedInput, destinationIds, destinationLabels, isDestinationAddress, routeOriginKey, type Apartment,
  type CommuteResponse, type DestinationId, type RouteAssumptions, type RouteResult,
  type Slot, type TravelMode,
} from "@/lib/apartments/contracts";

type Origin = { slot: Slot; apartment: Apartment };
type InFlight = { controller: AbortController; originKeys: string[] };
type RouteStatus = { kind: "loading" | "error" | "complete"; message: string };
const initialDestinations: Record<DestinationId, string> = { work: "", gym: "", friends: "" };

export function useCommutes(originSignature: string) {
  const [rawDestinations, setRawDestinations] = useState(initialDestinations);
  const [mode, setMode] = useState<TravelMode>("transit");
  const [departure, setDeparture] = useState("");
  const [workdays, setWorkdays] = useState(5);
  const [results, setResults] = useState<RouteResult[]>([]);
  const [status, setStatus] = useState<RouteStatus>();
  const request = useRef<InFlight | undefined>(undefined);
  const session = useRef<string | undefined>(undefined);
  const destinations = destinationIds.flatMap((id) => {
    const address = rawDestinations[id].trim();
    return address ? [{ id, address }] : [];
  });
  const assumptions: RouteAssumptions = {
    mode, departure: mode === "transit" ? parseNYDeparture(departure) ?? undefined : undefined,
  };

  useEffect(() => {
    setDeparture(nextWeekdayDeparture(new Date()));
    return () => request.current?.controller.abort();
  }, []);

  useEffect(() => {
    const keys = new Set<string>(JSON.parse(originSignature));
    const pending = request.current;
    if (pending?.originKeys.some((key) => !keys.has(key))) {
      pending.controller.abort();
      request.current = undefined;
      setStatus(undefined);
    }
    setResults((old) => old.some((result) => !keys.has(result.originKey))
      ? old.filter((result) => keys.has(result.originKey)) : old);
  }, [originSignature]);

  function invalidate(destination?: DestinationId) {
    request.current?.controller.abort();
    request.current = undefined;
    setStatus(undefined);
    setResults((old) => destination ? old.filter((item) => item.destination.id !== destination) : []);
  }

  function changeDestination(id: DestinationId, address: string) {
    invalidate(id);
    setRawDestinations((values) => ({ ...values, [id]: address }));
  }

  function changeMode(value: TravelMode) {
    invalidate();
    setMode(value);
  }

  function changeDeparture(value: string) {
    invalidate();
    setDeparture(value);
  }

  async function calculate(origins: Origin[]) {
    if (request.current || !origins.length) return;
    const invalid = destinations.find(({ address }) => !isDestinationAddress(address));
    const error = !destinations.length ? "Enter a Work, Gym, or Friends destination."
      : invalid ? `Enter a street address with city and state or ZIP for ${destinationLabels[invalid.id]}.`
        : mode === "transit" && (!assumptions.departure || !validDeparture(assumptions.departure, new Date()))
          ? "Choose an unambiguous New York departure within the next 14 days." : undefined;
    if (error) {
      setStatus({ kind: "error", message: error });
      return;
    }

    const controller = new AbortController();
    session.current ??= crypto.randomUUID();
    setStatus({ kind: "loading", message: "Calculating one-way routes…" });
    const selected = origins.map(({ slot, apartment }) => ({
      slot,
      address: confirmedInput(apartment.report.address),
      key: routeOriginKey(apartment.report.address),
    }));
    request.current = { controller, originKeys: selected.map(({ key }) => key) };

    try {
      const response = await fetch("/api/apartments/commutes", {
        method: "POST", cache: "no-store", signal: controller.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session: session.current, origins: selected, destinations, mode,
          departureLocal: mode === "transit" ? departure : undefined,
        }),
      });
      const payload = await response.json() as CommuteResponse | { error?: string };
      if (controller.signal.aborted) return;
      if (!("results" in payload)) {
        setStatus({ kind: "error", message: payload.error ?? "The route request failed. Try again." });
        return;
      }
      // Keep transient results for either workflow and only replace the requested pairs.
      const selectedKeys = new Set(selected.map(({ key }) => key));
      setResults((old) => [...old.filter((entry) => !selectedKeys.has(entry.originKey)), ...payload.results]);
      const count = payload.results.filter((entry) => entry.status === "available").length;
      const message = payload.overall === "disabled" ? "In-app routing is disabled. Directions links are available."
        : payload.overall === "throttled" ? "Route request limit reached. Try again in a minute."
          : count === payload.results.length ? "One-way routes updated."
            : `${count} of ${payload.results.length} one-way estimates available. See the details for each route.`;
      setStatus({ kind: "complete", message });
    } catch {
      if (!controller.signal.aborted) setStatus({ kind: "error", message: "Routes could not be loaded. Try again or open directions." });
    } finally {
      if (request.current?.controller === controller) request.current = undefined;
    }
  }

  return {
    rawDestinations, destinations, mode, departure, workdays, assumptions, results, status,
    changeDestination, changeMode, changeDeparture, setWorkdays, calculate,
  };
}

export type CommuteControlsState = ReturnType<typeof useCommutes>;

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { z } from "zod";

import { parseRent } from "@/lib/apartments/comparison";
import {
  confirmedInput, maxRentCents, type AddressInput, type Apartment, type ReportResponse, type ReportSlot, type Slot,
} from "@/lib/apartments/contracts";

type Issue = Exclude<ReportSlot, { status: "confirmed" }>;
export type AddressDraft = { street: string; area: string; rent: string };
export type SlotState = {
  draft: AddressDraft;
  apartment?: Apartment;
  issue?: Issue;
  pending?: "replace" | "refresh";
  refreshError?: string;
  editing: boolean;
};

const savedSchema = z.object({
  version: z.literal(1),
  input: z.object({
    street: z.string().trim().min(1).max(160),
    area: z.string().trim().min(1).max(40),
    selection: z.string().min(1).max(420).optional(),
  }),
  askingRentCents: z.number().int().nonnegative().max(maxRentCents).optional(),
});

type SavedBaseline = z.infer<typeof savedSchema>;
type WorkspaceState = { entries: Record<Slot, SlotState>; baseline?: SavedBaseline; ready: boolean };
type Work = { slot: Slot; input: AddressInput; rent?: number; purpose: "replace" | "refresh" };
export const baselineKey = "rentalshield:apartments:baseline:v1";

const emptyDraft: AddressDraft = { street: "", area: "", rent: "" };
const emptySlot = (): SlotState => ({ draft: emptyDraft, editing: true });
const initialState: WorkspaceState = { entries: { a: emptySlot(), b: emptySlot(), research: emptySlot() }, ready: false };
const genericError = "The address report could not be loaded. Try again.";

function readBaseline() {
  try {
    const stored = localStorage.getItem(baselineKey);
    if (!stored) return undefined;
    const parsed = savedSchema.safeParse(JSON.parse(stored));
    return parsed.success ? parsed.data : undefined;
  } catch {
    return undefined;
  }
}

function draftFor(input: AddressInput, rent?: number): AddressDraft {
  return { street: input.street, area: input.area ?? "", rent: rent === undefined ? "" : (rent / 100).toFixed(2) };
}

function saveApartment(apartment: Apartment): SavedBaseline {
  return {
    version: 1,
    input: { ...confirmedInput(apartment.report.address), area: apartment.report.address.zip ?? apartment.report.address.borough },
    askingRentCents: apartment.askingRentCents,
  };
}

function withApartment(apartment: Apartment, slot: Slot): SlotState {
  return {
    apartment,
    draft: draftFor(confirmedInput(apartment.report.address), apartment.askingRentCents),
    editing: slot === "research",
  };
}

function applyResults(state: WorkspaceState, work: Work[], results: ReportSlot[], current: (slot: Slot) => boolean) {
  const entries = { ...state.entries };
  let baseline = state.baseline;
  for (const item of work) {
    const { slot, purpose, rent } = item;
    if (!current(slot)) continue;
    const old = entries[slot];
    const outcome = results.find((result) => result.slot === slot);
    if (purpose === "refresh") {
      if (outcome?.status === "confirmed" && old.apartment?.report.address.key === outcome.report.address.key) {
        entries[slot] = { ...old, pending: undefined, refreshError: undefined, apartment: { ...old.apartment, report: outcome.report } };
      } else {
        entries[slot] = { ...old, pending: undefined, refreshError: "Could not refresh the existing address report. Try again." };
      }
      continue;
    }
    if (outcome?.status !== "confirmed") {
      entries[slot] = { ...old, pending: undefined, issue: outcome ?? { slot, status: "unavailable", message: genericError } };
      continue;
    }
    const apartment: Apartment = { report: outcome.report, askingRentCents: rent };
    entries[slot] = withApartment(apartment, slot);
    if (slot === "a") {
      baseline = saveApartment(apartment);
    } else if (slot === "research" && !baseline && !entries.a.pending && !entries.a.apartment) {
      baseline = saveApartment(apartment);
      entries.a = withApartment(apartment, "a");
    }
  }
  return { ...state, entries, baseline };
}

export function needsRetry(apartment?: Apartment) {
  if (!apartment) return false;
  const { violations, heat, bedbugs, noise, trees } = apartment.report;
  return [violations, heat, bedbugs, noise, trees].some((item) => item.status === "unavailable") ||
    (bedbugs.status === "available" && bedbugs.value.some((period) => period.status === "unavailable"));
}

export function useReports(openCompare: boolean) {
  const [state, setState] = useState(initialState);
  const requestSequence = useRef<Record<Slot, number>>({ a: 0, b: 0, research: 0 });
  const restoreAttempted = useRef(false);
  const inFlight = useRef(new Set<AbortController>());

  useEffect(() => {
    const baseline = readBaseline();
    setState((previous) => {
      const a = baseline ? { ...previous.entries.a, draft: draftFor(baseline.input, baseline.askingRentCents) } : previous.entries.a;
      return { ...previous, entries: { ...previous.entries, a }, baseline, ready: true };
    });
    const controllers = inFlight.current;
    return () => controllers.forEach((request) => request.abort());
  }, []);

  useEffect(() => {
    if (!state.ready) return;
    try {
      if (state.baseline) localStorage.setItem(baselineKey, JSON.stringify(state.baseline));
      else localStorage.removeItem(baselineKey);
    } catch {
      // The in-memory baseline still works when browser storage is blocked.
    }
  }, [state.baseline, state.ready]);

  const run = useCallback(async (work: Work[]) => {
    if (!work.length) return;
    const tokens = new Map(work.map(({ slot }) => [slot, ++requestSequence.current[slot]]));
    const controller = new AbortController();
    inFlight.current.add(controller);
    const current = (slot: Slot) => tokens.get(slot) === requestSequence.current[slot];
    setState((previous) => {
      const entries = { ...previous.entries };
      for (const { slot, purpose } of work) {
        entries[slot] = {
          ...entries[slot], pending: purpose, refreshError: undefined,
          issue: purpose === "replace" ? undefined : entries[slot].issue,
        };
      }
      return { ...previous, entries };
    });
    let results: ReportSlot[] = [];
    try {
      const response = await fetch("/api/apartments/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({ addresses: work.map(({ slot, input }) => ({ slot, input })) }),
      });
      if (response.ok) results = (await response.json() as ReportResponse).results;
    } catch {
      if (controller.signal.aborted) return;
    } finally {
      inFlight.current.delete(controller);
    }
    setState((previous) => applyResults(previous, work, results, current));
  }, []);

  useEffect(() => {
    if (!openCompare || !state.ready || !state.baseline || state.entries.a.apartment || restoreAttempted.current) return;
    restoreAttempted.current = true;
    void run([{ slot: "a", purpose: "replace", input: state.baseline.input, rent: state.baseline.askingRentCents }]);
  }, [openCompare, state.ready, state.baseline, state.entries.a.apartment, run]);

  function updateSlot(slot: Slot, update: (entry: SlotState) => SlotState) {
    setState((previous) => ({
      ...previous,
      entries: { ...previous.entries, [slot]: update(previous.entries[slot]) },
    }));
  }

  function editDraft(slot: Slot, patch: Partial<AddressDraft>) {
    ++requestSequence.current[slot];
    updateSlot(slot, (entry) => ({ ...entry, draft: { ...entry.draft, ...patch }, issue: undefined, pending: undefined }));
  }

  function beginReplace(slot: "a" | "b") {
    updateSlot(slot, (entry) => ({ ...entry, editing: true, issue: undefined }));
  }

  function cancelReplace(slot: "a" | "b") {
    ++requestSequence.current[slot];
    updateSlot(slot, (entry) => entry.apartment ? withApartment(entry.apartment, slot) : emptySlot());
  }

  function refresh(slots: Slot[]) {
    const work = slots.flatMap((slot): Work[] => {
      const entry = state.entries[slot];
      return entry.apartment && !entry.pending
        ? [{ slot, purpose: "refresh", input: confirmedInput(entry.apartment.report.address) }] : [];
    });
    void run(work);
  }

  function submit(slots: Slot[], selection?: string) {
    const work = slots.flatMap((slot): Work[] => {
      const { draft, pending, editing } = state.entries[slot];
      if (!editing || pending === "replace") return [];
      const rent = parseRent(draft.rent);
      const message = !draft.street.trim() ? "Enter a street address."
        : Number.isNaN(rent) ? "Enter a monthly rent in dollars and cents." : undefined;
      if (message) {
        updateSlot(slot, (entry) => ({ ...entry, issue: { slot, status: "invalid", message } }));
        return [];
      }
      return [{ slot, input: { street: draft.street, area: draft.area || undefined, selection }, purpose: "replace", rent }];
    });
    if (work.length === 1 && work[0].slot !== "research") {
      const slot = work[0].slot === "a" ? "b" : "a";
      const other = state.entries[slot];
      if (other.apartment && !other.pending) {
        work.push({ slot, input: confirmedInput(other.apartment.report.address), purpose: "refresh" });
      }
    }
    void run(work);
  }

  function clear() {
    restoreAttempted.current = true;
    ++requestSequence.current.a;
    setState((previous) => ({
      ...previous, baseline: undefined, entries: { ...previous.entries, a: emptySlot() },
    }));
  }

  function swap() {
    ++requestSequence.current.a;
    ++requestSequence.current.b;
    setState((previous) => {
      const a = previous.entries.a.apartment;
      const b = previous.entries.b.apartment;
      if (!a || !b) return previous;
      return {
        ...previous,
        baseline: saveApartment(b),
        entries: { ...previous.entries, a: withApartment(b, "a"), b: withApartment(a, "b") },
      };
    });
  }

  function setResearchRent(askingRentCents?: number) {
    updateSlot("research", (entry) => entry.apartment
      ? { ...entry, apartment: { ...entry.apartment, askingRentCents }, draft: { ...entry.draft, rent: draftFor(entry.draft, askingRentCents).rent } }
      : entry);
  }

  return { ...state, editDraft, beginReplace, cancelReplace, refresh, submit, clear, swap, setResearchRent };
}

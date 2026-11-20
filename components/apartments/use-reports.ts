"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { parseRent } from "@/lib/apartments/comparison";
import { confirmedInput, type Apartment, type ReportResponse, type ReportSlot, type Slot } from "@/lib/apartments/contracts";

import {
  applyResearchRent, applyResults, baselineKey, emptySlot, initialState, parseBaseline, receiveBaseline, saveApartment, withApartment,
  type AddressDraft, type SlotState, type Work, type WorkspaceState,
} from "./report-state";

export function needsRetry(apartment?: Apartment) {
  if (!apartment) return false;
  const { violations, heat, bedbugs, noise, trees } = apartment.report;
  return [violations, heat, bedbugs, noise, trees].some((item) => item.status === "unavailable") ||
    (bedbugs.status === "available" && bedbugs.value.some((period) => period.status === "unavailable"));
}

export function useReports(openCompare: boolean) {
  const [state, setState] = useState(initialState);
  const workspace = useRef(initialState);
  const mounted = useRef(false);
  const canPersist = useRef(true);
  const requestSequence = useRef<Record<Slot, number>>({ a: 0, b: 0, research: 0 });
  const restoreAttempted = useRef(false);
  const inFlight = useRef(new Set<AbortController>());

  const updateWorkspace = useCallback((update: (previous: WorkspaceState) => WorkspaceState) => {
    if (!mounted.current) return;
    const next = update(workspace.current);
    if (next === workspace.current) return;
    workspace.current = next;
    setState(next);
  }, []);

  const syncBaseline = useCallback((previous: WorkspaceState) => {
    if (!canPersist.current) return previous;
    try {
      const next = receiveBaseline(previous, parseBaseline(localStorage.getItem(baselineKey)));
      if (next !== previous) {
        ++requestSequence.current.a;
        restoreAttempted.current = false;
      }
      return next;
    } catch {
      canPersist.current = false;
      return previous;
    }
  }, []);

  const updateBaseline = useCallback((update: (previous: WorkspaceState) => WorkspaceState) => {
    const commit = () => updateWorkspace((previous) => {
      // Read storage even if the browser has not delivered the other tab's storage event yet.
      const current = syncBaseline(previous);
      const next = update(current);
      if (canPersist.current && next.baseline !== current.baseline) {
        try {
          if (next.baseline) localStorage.setItem(baselineKey, JSON.stringify(next.baseline));
          else localStorage.removeItem(baselineKey);
        } catch {
          canPersist.current = false;
        }
      }
      return next;
    });
    if (canPersist.current && navigator.locks) {
      void navigator.locks.request(baselineKey, commit).catch(() => commit());
    } else {
      commit();
    }
  }, [syncBaseline, updateWorkspace]);

  useEffect(() => {
    mounted.current = true;
    const onStorage = (event: StorageEvent) => {
      if (event.key === baselineKey || event.key === null) updateWorkspace(syncBaseline);
    };
    window.addEventListener("storage", onStorage);
    updateWorkspace((previous) => ({ ...syncBaseline(previous), ready: true }));
    const controllers = inFlight.current;
    return () => {
      mounted.current = false;
      window.removeEventListener("storage", onStorage);
      controllers.forEach((request) => request.abort());
    };
  }, [syncBaseline, updateWorkspace]);

  const run = useCallback(async (work: Work[]) => {
    if (!work.length) return;
    const tokens = new Map(work.map(({ slot }) => [slot, ++requestSequence.current[slot]]));
    const controller = new AbortController();
    inFlight.current.add(controller);
    const current = (slot: Slot) => tokens.get(slot) === requestSequence.current[slot];
    updateWorkspace((previous) => {
      const entries = { ...previous.entries };
      for (const { slot, purpose } of work) {
        entries[slot] = {
          ...entries[slot], pending: purpose === "refresh" ? "refresh" : "replace", refreshError: undefined,
          issue: purpose === "refresh" ? entries[slot].issue : undefined,
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
    if (!controller.signal.aborted) updateBaseline((previous) => applyResults(previous, work, results, current));
  }, [updateBaseline, updateWorkspace]);

  useEffect(() => {
    const { ready, baseline, entries } = workspace.current;
    if (!openCompare || !ready || !baseline || entries.a.apartment || entries.a.pending || restoreAttempted.current) return;
    restoreAttempted.current = true;
    void run([{ slot: "a", purpose: "restore", input: baseline.input, rent: baseline.askingRentCents }]);
  }, [openCompare, state.ready, state.baseline, state.entries.a.apartment, state.entries.a.pending, run]);

  function updateSlot(slot: Slot, update: (entry: SlotState) => SlotState) {
    updateWorkspace((previous) => ({
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
      const entry = workspace.current.entries[slot];
      return entry.apartment && !entry.pending
        ? [{ slot, purpose: "refresh", input: confirmedInput(entry.apartment.report.address) }] : [];
    });
    void run(work);
  }

  function submit(slots: Slot[], selection?: string) {
    const { entries, baseline } = workspace.current;
    const work = slots.flatMap((slot): Work[] => {
      const { draft, pending, editing } = entries[slot];
      if (!editing || pending === "replace") return [];
      const rent = parseRent(draft.rent);
      const message = !draft.street.trim() ? "Enter a street address."
        : Number.isNaN(rent) ? "Enter a monthly rent in dollars and cents." : undefined;
      if (message) {
        updateSlot(slot, (entry) => ({ ...entry, issue: { slot, status: "invalid", message } }));
        return [];
      }
      return [{
        slot, input: { street: draft.street, area: draft.area || undefined, selection }, purpose: "replace", rent,
        seedBaseline: slot === "research" && !baseline,
      }];
    });
    if (work.length === 1 && work[0].slot !== "research") {
      const slot = work[0].slot === "a" ? "b" : "a";
      const other = entries[slot];
      if (other.apartment && !other.pending) {
        work.push({ slot, input: confirmedInput(other.apartment.report.address), purpose: "refresh" });
      }
    }
    void run(work);
  }

  function clear() {
    updateBaseline((previous) => {
      ++requestSequence.current.a;
      return { ...previous, baseline: undefined, entries: { ...previous.entries, a: emptySlot() }, researchSeededBaseline: false };
    });
  }

  function swap() {
    updateBaseline((previous) => {
      const a = previous.entries.a.apartment;
      const b = previous.entries.b.apartment;
      if (!a || !b) return previous;
      ++requestSequence.current.a;
      ++requestSequence.current.b;
      return {
        ...previous,
        baseline: saveApartment(b),
        entries: { ...previous.entries, a: withApartment(b, "a"), b: withApartment(a, "b") },
        researchSeededBaseline: false,
      };
    });
  }

  function setResearchRent(askingRentCents?: number) {
    const addressKey = state.entries.research.apartment?.report.address.key;
    updateBaseline((previous) => previous.entries.research.apartment?.report.address.key === addressKey
      ? applyResearchRent(previous, askingRentCents)
      : previous);
  }

  return { ...state, editDraft, beginReplace, cancelReplace, refresh, submit, clear, swap, setResearchRent };
}

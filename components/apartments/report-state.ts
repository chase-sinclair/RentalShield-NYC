import { z } from "zod";

import {
  confirmedInput, maxRentCents, type AddressInput, type Apartment, type ReportSlot, type Slot,
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
export type WorkspaceState = { entries: Record<Slot, SlotState>; baseline?: SavedBaseline; ready: boolean };
export type Work = {
  slot: Slot;
  input: AddressInput;
  rent?: number;
  purpose: "replace" | "restore" | "refresh";
  seedBaseline?: boolean;
};

export const baselineKey = "rentalshield:apartments:baseline:v1";
export const emptySlot = (): SlotState => ({ draft: { street: "", area: "", rent: "" }, editing: true });
export const initialState: WorkspaceState = { entries: { a: emptySlot(), b: emptySlot(), research: emptySlot() }, ready: false };

export function parseBaseline(stored: string | null): SavedBaseline | undefined {
  if (!stored) return undefined;
  try {
    const parsed = savedSchema.safeParse(JSON.parse(stored));
    return parsed.success ? parsed.data : undefined;
  } catch {
    return undefined;
  }
}

export function draftFor(input: AddressInput, rent?: number): AddressDraft {
  return { street: input.street, area: input.area ?? "", rent: rent === undefined ? "" : (rent / 100).toFixed(2) };
}

export function saveApartment(apartment: Apartment): SavedBaseline {
  const { address } = apartment.report;
  return {
    version: 1,
    input: { ...confirmedInput(address), area: address.zip ?? address.borough },
    askingRentCents: apartment.askingRentCents,
  };
}

export function withApartment(apartment: Apartment, slot: Slot): SlotState {
  return {
    apartment,
    draft: draftFor(confirmedInput(apartment.report.address), apartment.askingRentCents),
    editing: slot === "research",
  };
}

function sameInput(a: AddressInput, b: AddressInput) {
  return a.street === b.street && a.area === b.area && a.selection === b.selection;
}

export function receiveBaseline(state: WorkspaceState, baseline?: SavedBaseline): WorkspaceState {
  const saved = state.baseline;
  if (baseline === saved || (baseline && saved && sameInput(baseline.input, saved.input) &&
      baseline.askingRentCents === saved.askingRentCents)) return state;

  let a = emptySlot();
  if (baseline) {
    const apartment = state.entries.a.apartment;
    a = apartment && sameInput(baseline.input, confirmedInput(apartment.report.address))
      ? withApartment({ ...apartment, askingRentCents: baseline.askingRentCents }, "a")
      : { ...a, draft: draftFor(baseline.input, baseline.askingRentCents) };
  }
  return { ...state, baseline, entries: { ...state.entries, a } };
}

export function applyResults(state: WorkspaceState, work: Work[], results: ReportSlot[], current: (slot: Slot) => boolean): WorkspaceState {
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
      entries[slot] = { ...old, pending: undefined, issue: outcome ?? { slot, status: "unavailable", message: "The address report could not be loaded. Try again." } };
      continue;
    }
    const apartment: Apartment = { report: outcome.report, askingRentCents: rent };
    entries[slot] = withApartment(apartment, slot);
    if (slot === "a" && purpose === "replace") {
      baseline = saveApartment(apartment);
    } else if (slot === "research" && item.seedBaseline && !baseline && !entries.a.pending && !entries.a.apartment) {
      baseline = saveApartment(apartment);
      entries.a = withApartment(apartment, "a");
    }
  }
  return { ...state, entries, baseline };
}

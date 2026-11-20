import assert from "node:assert/strict";
import test from "node:test";

import {
  applyResearchRent, applyResults, clearBaseline, initialState, parseBaseline, receiveBaseline, saveApartment, withApartment, type Work,
} from "../../components/apartments/report-state";
import { confirmedInput, type Slot } from "../../lib/apartments/contracts";
import { demoApartments } from "../../lib/apartments/demo";

const [a, b] = demoApartments;
const work = (slot: Slot, apartment = a, purpose: Work["purpose"] = "replace"): Work => ({
  slot, input: confirmedInput(apartment.report.address), rent: apartment.askingRentCents, purpose,
});
const result = (slot: Slot, apartment = a) => ({ slot, status: "confirmed" as const, report: apartment.report });
const current = () => true;

test("receives only confirmed A from another tab and preserves B and Research", () => {
  const bEntry = withApartment(b, "b");
  const research = withApartment(a, "research");
  const local = { ...initialState, entries: { ...initialState.entries, b: bEntry, research } };
  const saved = {
    version: 1,
    input: { street: a.report.address.street, area: a.report.address.borough, selection: a.report.address.key },
    askingRentCents: a.askingRentCents,
  };
  const parsed = parseBaseline(JSON.stringify(saved));
  const synced = receiveBaseline(local, parsed);
  assert.deepEqual(synced.baseline, saved);
  assert.equal(synced.entries.a.draft.rent, "2650.00");
  assert.equal(synced.entries.b, bEntry);
  assert.equal(synced.entries.research, research);
  assert.equal(receiveBaseline(synced, parseBaseline(JSON.stringify(saved))), synced);

  const cleared = receiveBaseline(synced, parseBaseline(null));
  assert.equal(cleared.baseline, undefined);
  assert.equal(cleared.entries.a.draft.street, "");
  assert.equal(cleared.entries.b, bEntry);
  assert.equal(parseBaseline("{"), undefined);
});

test("restoring A does not replace the saved value and a stale A result leaves B usable", () => {
  const saved = saveApartment(a);
  const local = receiveBaseline(initialState, saved);
  const restored = applyResults(local, [work("a", a, "restore")], [result("a")], current);
  assert.equal(restored.baseline, saved);
  assert.equal(restored.entries.a.apartment?.askingRentCents, 265000);

  const cleared = receiveBaseline(local, undefined);
  const stale = applyResults(cleared, [work("a", a, "restore"), work("b", b)], [result("a"), result("b", b)], (slot) => slot !== "a");
  assert.equal(stale.baseline, undefined);
  assert.equal(stale.entries.a.apartment, undefined);
  assert.equal(stale.entries.b.apartment?.report, b.report);
});

test("Research can seed an empty A but preserves a baseline that arrived during the lookup", () => {
  const seed = { ...work("research", b), seedAtClearCount: initialState.baselineClearCount };
  const seeded = applyResults(initialState, [seed], [result("research", b)], current);
  assert.equal(seeded.baseline?.input.selection, b.report.address.key);
  assert.equal(seeded.entries.a.apartment?.report, b.report);

  const saved = saveApartment(a);
  const synced = receiveBaseline(initialState, saved);
  const independent = applyResults(synced, [seed], [result("research", b)], current);
  assert.equal(independent.baseline, saved);
  assert.equal(independent.entries.research.apartment?.report, b.report);
  assert.equal(independent.entries.a.draft.street, a.report.address.street);
  assert.equal(applyResults(initialState, [work("research", b)], [result("research", b)], current).baseline, undefined);
});

test("a clear prevents earlier Research from seeding A even when another tab saw A empty throughout", () => {
  const earlier = { ...work("research", b), seedAtClearCount: initialState.baselineClearCount };
  const pair = applyResults(initialState, [work("a"), work("b", b)], [result("a"), result("b", b)], current);
  const cleared = clearBaseline(pair);
  assert.equal(cleared.entries.b, pair.entries.b);
  const otherTab = receiveBaseline(initialState, undefined, cleared.baselineClearCount);

  for (const state of [cleared, otherTab]) {
    const completed = applyResults(state, [earlier], [result("research", b)], current);
    assert.equal(completed.baseline, undefined);
    assert.equal(completed.entries.a.apartment, undefined);
    assert.equal(completed.entries.b, state.entries.b);
    assert.equal(completed.entries.research.apartment?.report, b.report);
    assert.equal(applyResearchRent(completed, 275000).baseline, undefined);

    const fresh = { ...earlier, seedAtClearCount: state.baselineClearCount };
    const seeded = applyResults(completed, [fresh], [result("research", b)], current);
    assert.equal(seeded.baseline?.input.selection, b.report.address.key);
  }
});

test("saving and clearing an asking rent carries into the active Research seed", () => {
  const seed = { ...work("research"), rent: undefined, seedAtClearCount: initialState.baselineClearCount };
  const seeded = applyResults(initialState, [seed], [result("research")], current);
  const edited = applyResearchRent(seeded, 265035);
  assert.equal(edited.entries.research.apartment?.askingRentCents, 265035);
  assert.equal(edited.entries.a.apartment?.askingRentCents, 265035);
  assert.equal(edited.entries.a.draft.rent, "2650.35");
  assert.equal(parseBaseline(JSON.stringify(edited.baseline))?.askingRentCents, 265035);
  assert.equal(edited.baseline?.revision, seeded.baseline?.revision);

  const clearedRent = applyResearchRent(edited, undefined);
  assert.equal(clearedRent.entries.a.apartment?.askingRentCents, undefined);
  assert.equal(clearedRent.entries.a.draft.rent, "");
  assert.equal(parseBaseline(JSON.stringify(clearedRent.baseline))?.askingRentCents, undefined);
});

test("research rent edits stay independent after A or the Research result is replaced", () => {
  const seed = { ...work("research"), seedAtClearCount: initialState.baselineClearCount };
  const seeded = applyResults(initialState, [seed], [result("research")], current);
  const replacement = { ...a, askingRentCents: 321000 };
  const updatedA = applyResults(seeded, [work("a", replacement)], [result("a", replacement)], current);
  const updatedResearch = applyResults(seeded, [work("research")], [result("research")], current);
  const newSaved = parseBaseline(JSON.stringify({ ...saveApartment(a), revision: "591f443e-a066-4d56-82df-f71497260a5c" }));
  const fromOtherTab = receiveBaseline(seeded, newSaved);

  for (const state of [updatedA, updatedResearch, fromOtherTab]) {
    const edited = applyResearchRent(state, 275000);
    assert.equal(edited.baseline, state.baseline);
    assert.equal(edited.entries.a, state.entries.a);
    assert.equal(edited.entries.research.apartment?.askingRentCents, 275000);
  }
});

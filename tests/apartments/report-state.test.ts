import assert from "node:assert/strict";
import test from "node:test";

import {
  applyResults, initialState, parseBaseline, receiveBaseline, saveApartment, withApartment, type Work,
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
  const saved = saveApartment(a);
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
  const seed = { ...work("research", b), seedBaseline: true };
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

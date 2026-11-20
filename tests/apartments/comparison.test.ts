import assert from "node:assert/strict";
import test from "node:test";

import { reportingWindow, nextWeekdayDeparture, parseNYDeparture } from "../../lib/apartments/calendar";
import {
  compareRoutes, findRoute, formatDuration, metricDifference, parseRent, summarize, tourQuestions,
} from "../../lib/apartments/comparison";
import type { RouteAssumptions } from "../../lib/apartments/contracts";
import { demoApartments, demoDate, demoRoutes, demoWork } from "../../lib/apartments/demo";

const [a, b] = demoApartments;
const assumptions: RouteAssumptions = { mode: "transit", departure: demoDate };
const routes = demoRoutes(assumptions);

test("demo follows the approved annual, one-way, and weekly arithmetic", () => {
  const summary = summarize(a, b, demoWork, assumptions, routes, 5).map(({ text }) => text);
  assert.match(summary[0], /\$150 more per month \(\$1,800 more over 12 months/);
  assert.match(summary[1], /41 minutes one way from A, 29 minutes from B/);
  assert.match(summary[1], /12 minutes each morning and 60 minutes over 5 workdays/);
  assert.match(summary[2], /B has 1 fewer open Class C violation/);
  assert.deepEqual(compareRoutes(routes[0], routes[1], 3), {
    oneWaySeconds: -720, weeklySeconds: -2160, morning: true,
  });
  assert.deepEqual(compareRoutes(routes[1], routes[0], 5), {
    oneWaySeconds: 720, weeklySeconds: 3600, morning: true,
  });
  assert.equal(compareRoutes(routes[0], routes[0], 5)?.oneWaySeconds, 0);
  assert.equal(metricDifference(a, b, "C"), -1);
  assert.equal(metricDifference(a, b, "noise"), 15);
  assert.equal(metricDifference(b, a, "noise"), -15);
  assert.deepEqual(tourQuestions(a, b).map(({ priority }) => priority), [0, 2, 3]);
});

test("comparison rejects mismatched provenance, dates, mode, destination, and missing route", () => {
  const liveA = { ...a, report: { ...a.report, provenance: "live" as const } };
  assert.equal(metricDifference(liveA, b, "heat"), undefined);
  const nextDayB = {
    ...b, report: { ...b.report, trees: { ...b.report.trees, scope: { ...b.report.trees.scope, referenceDate: "2026-05-04" } } },
  };
  assert.equal(metricDifference(a, nextDayB, "trees"), undefined);
  assert.equal(findRoute(a, demoWork, { mode: "walking" }, routes), undefined);
  assert.equal(findRoute(a, { ...demoWork, address: "9 Paper Mill Square" }, assumptions, routes), undefined);
  assert.equal(compareRoutes(routes[0], undefined, 5), undefined);
  assert.equal(compareRoutes(routes[0], { ...routes[1], assumptions: { ...assumptions, departure: "2026-05-05T12:30:00.000Z" } }, 5), undefined);
  assert.equal(compareRoutes(...(demoRoutes({ mode: "walking" }) as [typeof routes[number], typeof routes[number]]), 5)?.morning, false);
});

test("rent accepts cent increments and route differences preserve nonzero sub-minute values", () => {
  assert.equal(parseRent("$2,650.19"), 265019);
  assert.equal(parseRent(".01"), 1);
  assert.equal(parseRent("0"), 0);
  assert.equal(parseRent("   "), undefined);
  assert.ok(Number.isNaN(parseRent("2,65.001")));
  assert.ok(Number.isNaN(parseRent("-12")));
  assert.equal(formatDuration(0), "0 minutes");
  assert.equal(formatDuration(1), "under 1 minute");
  assert.equal(formatDuration(59), "under 1 minute");
});

test("reporting reference uses New York dates, complete annual cycles, and calendar months", () => {
  const before = reportingWindow(new Date("2026-01-01T04:59:59Z"));
  const after = reportingWindow(new Date("2026-01-01T05:00:00Z"));
  assert.equal(before.asOf, "2025-12-31");
  assert.deepEqual(before.bedbugs[0], { start: "2023-11-01", end: "2024-10-31" });
  assert.deepEqual(after.bedbugs[0], { start: "2024-11-01", end: "2025-10-31" });
  const leap = reportingWindow(new Date("2024-02-29T18:00:00Z"));
  assert.deepEqual(leap.heat, { start: "2023-02-28", end: "2024-02-29" });
  assert.deepEqual(leap.noise, { start: "2023-12-01", end: "2024-02-29" });
});

test("New York departure handles the weekend, daylight-saving offsets, gaps and folds", () => {
  assert.equal(nextWeekdayDeparture(new Date("2026-11-20T18:00:00Z")), "2026-11-23T08:30");
  assert.equal(parseNYDeparture("2026-01-05T08:30"), "2026-01-05T13:30:00.000Z");
  assert.equal(parseNYDeparture("2026-06-01T08:30"), "2026-06-01T12:30:00.000Z");
  assert.equal(parseNYDeparture("2026-03-08T02:30"), null);
  assert.equal(parseNYDeparture("2026-11-01T01:30"), null);
  assert.equal(parseNYDeparture("2026-02-30T08:30"), null);
});

import type { ReactNode } from "react";
import { Building2, Coins, TrainFront } from "lucide-react";

import { formatPeriod } from "@/lib/apartments/calendar";
import {
  comparableEvidence, compareRoutes, countDifference, countWording, findRoute, formatDuration, formatRent,
  metricDifference, routeMetricTitle, selectedPeriod, summarize, tourQuestions,
} from "@/lib/apartments/comparison";
import {
  destinationLabels, rentHistoryUrl, type Apartment, type Destination, type Evidence, type EvidenceScope,
  type Provenance, type RouteAssumptions, type RouteResult,
} from "@/lib/apartments/contracts";

import { EvidenceNote, EvidenceRow, FilingValue, Missing, RecordCount, ViolationExamples } from "./evidence";
import { Assumptions, RouteValue } from "./route-evidence";

const recordMetrics = [
  { id: "class-c", key: "C", title: "Open Class C violations", one: "open Class C violation", many: "open Class C violations" },
  { id: "class-b", key: "B", title: "Open Class B violations", one: "open Class B violation", many: "open Class B violations" },
  { id: "heat", key: "heat", title: "Heat and hot-water reports", one: "heat or hot-water report", many: "heat or hot-water reports" },
  { id: "noise", key: "noise", title: "Nearby noise reports", one: "noise report", many: "noise reports" },
  { id: "trees", key: "trees", title: "Populated street tree sites", one: "populated street tree site", many: "populated street tree sites" },
] as const;

const summaryIcons = { rent: Coins, commute: TrainFront, building: Building2 };
type RecordMetric = (typeof recordMetrics)[number]["key"];

function countDelta(value: number | undefined, single: string, plural: string) {
  if (value === undefined) return undefined;
  return value === 0 ? "Equal" : `B has ${countWording(value, single, plural)}`;
}

function recordScope(apartment: Apartment | undefined, key: RecordMetric) {
  return key === "B" || key === "C" ? apartment?.report.violations.scope : apartment?.report[key].scope;
}

function recordValue(apartment: Apartment | undefined, key: RecordMetric) {
  if (!apartment) return <Missing label="Apartment needed" />;
  if (key === "B" || key === "C") {
    const violations = apartment.report.violations;
    if (violations.status === "unavailable") return <Missing reason={violations.reason} />;
    return (
      <>
        <RecordCount value={violations.value[key].count} />
        <ViolationExamples examples={violations.value[key].examples} />
      </>
    );
  }
  const evidence = apartment.report[key];
  return evidence.status === "available" ? <RecordCount value={evidence.value} /> : <Missing reason={evidence.reason} />;
}

function SourceNotes({ a, b, provenance }: { a?: EvidenceScope; b?: EvidenceScope; provenance: Provenance }) {
  const isShared = a && b && JSON.stringify(a) === JSON.stringify(b);
  if (isShared || !b) return a && <EvidenceNote scope={a} provenance={provenance} />;
  if (!a) return <EvidenceNote scope={b} provenance={provenance} />;
  return (
    <div className="flex flex-col gap-2">
      <div><span className="apt-column-label">A source</span><EvidenceNote scope={a} provenance={provenance} /></div>
      <div><span className="apt-column-label">B source</span><EvidenceNote scope={b} provenance={provenance} /></div>
    </div>
  );
}

function askingRent(apartment?: Apartment) {
  if (!apartment) return <Missing label="Apartment needed" />;
  return apartment.askingRentCents === undefined
    ? <Missing label="Not entered" />
    : <strong className="apt-number">{formatRent(apartment.askingRentCents)} <small>/ month</small></strong>;
}

function rentDifference(a?: Apartment, b?: Apartment) {
  const cents = a?.report.provenance === b?.report.provenance
    ? countDifference(a?.askingRentCents, b?.askingRentCents) : undefined;
  if (cents === undefined) return undefined;
  if (cents === 0) return "Equal";
  const direction = cents < 0 ? "less" : "more";
  return (
    <>
      <strong>{formatRent(Math.abs(cents))} {direction} per month for B</strong>
      <p className="apt-note">{formatRent(Math.abs(cents) * 12)} {direction} over 12 months at the asking rent</p>
    </>
  );
}

function filingDelta(
  first: ReturnType<typeof selectedPeriod>, second: ReturnType<typeof selectedPeriod>, comparable: boolean,
) {
  if (!comparable || first?.status !== "filed" || second?.status !== "filed") return undefined;
  const infested = countDifference(first.infested, second.infested);
  const total = countDifference(first.total, second.total);
  if (infested === undefined && total === undefined) return undefined;
  return (
    <dl className="apt-filing">
      <dt className="apt-note">Units reported</dt>
      <dd>{countDelta(infested, "unit reported", "units reported") ?? "Unavailable"}</dd>
      <dt className="apt-note">Total dwelling units</dt>
      <dd>{countDelta(total, "total dwelling unit", "total dwelling units") ?? "Unavailable"}</dd>
    </dl>
  );
}

export function ComparisonReport({ a, b, destinations, assumptions, routes, workdays, controls }: {
  a?: Apartment;
  b?: Apartment;
  destinations: Destination[];
  assumptions: RouteAssumptions;
  routes: RouteResult[];
  workdays: number;
  controls?: ReactNode;
}) {
  const work = destinations.find((destination) => destination.id === "work");
  const provenance = a?.report.provenance ?? b?.report.provenance ?? "live";
  const summary = summarize(a, b, work, assumptions, routes, workdays);
  const questions = tourQuestions(a, b);
  const periods = a?.report.window.bedbugs ?? b?.report.window.bedbugs ?? [];
  const bugA = a?.report.bedbugs;
  const bugB = b?.report.bedbugs;
  const filingComparable = comparableEvidence(a, b, bugA, bugB);
  const differentDates = a && b && a.report.window.asOf !== b.report.window.asOf;
  const beforeFilings = recordMetrics.slice(0, 3);
  const blockMetrics = recordMetrics.slice(3);

  function recordRow({ id, key, title, one, many }: (typeof recordMetrics)[number]) {
    return (
      <EvidenceRow
        id={id} key={id} title={title}
        note={<SourceNotes a={recordScope(a, key)} b={recordScope(b, key)} provenance={provenance} />}
        a={recordValue(a, key)} b={recordValue(b, key)}
        difference={countDelta(metricDifference(a, b, key), one, many)}
      />
    );
  }

  function filingCell(apartment: Apartment | undefined, evidence: Evidence<unknown> | undefined, filing: ReturnType<typeof selectedPeriod>) {
    if (!apartment) return <Missing label="Apartment needed" />;
    if (evidence?.status === "unavailable") return <Missing reason={evidence.reason} />;
    return <FilingValue filing={filing} />;
  }

  return (
    <div className="apt-report">
      <section className="apt-summary" aria-labelledby="tradeoffs-title">
        <h2 id="tradeoffs-title" className="apt-heading">The tradeoffs</h2>
        <ul>
          {summary.map(({ category, text }) => {
            const Icon = summaryIcons[category];
            return <li key={category}><Icon aria-hidden="true" /><span>{text}</span></li>;
          })}
        </ul>
      </section>

      <section aria-labelledby="evidence-title" id="evidence" className="apt-evidence">
        <h2 id="evidence-title" className="apt-heading">Side-by-side evidence</h2>
        {differentDates && <p className="apt-note">Refresh apartment records to compare them on the same reporting date.</p>}
        {controls}
        <div className="apt-evidence-grid">
          <EvidenceRow
            id="asking-rent" title="Asking rent"
            note={<div className="apt-note"><p>{provenance === "demo" ? "Sample listing rents" : "User-entered monthly rent"}</p><a className="apt-link" href={rentHistoryUrl}>Request official apartment rent history</a><p>Tenant request through NYS HCR. The response is mailed to the apartment.</p></div>}
            a={askingRent(a)} b={askingRent(b)} difference={rentDifference(a, b)}
          />
          {!work && (
            <EvidenceRow title="One-way work commute" a={<Missing label="Not entered" />} b={<Missing label="Not entered" />}
              note={<p className="apt-note">Add a Work destination to estimate one-way travel.</p>} />
          )}
          {destinations.map((destination) => {
            const first = findRoute(a, destination, assumptions, routes);
            const second = findRoute(b, destination, assumptions, routes);
            const delta = compareRoutes(first, second, workdays);
            const direction = (seconds: number) => seconds < 0 ? "less" : "more";
            return (
              <EvidenceRow
                key={destination.id}
                title={routeMetricTitle(destination.id, assumptions)}
                note={<><p className="apt-note">{destinationLabels[destination.id]} · {destination.address}</p><Assumptions assumptions={assumptions} />{destination.id === "work" && <p className="apt-note">{workdays} {workdays === 1 ? "workday" : "workdays"} per week</p>}</>}
                a={<RouteValue route={first} apartment={a} destination={destination} assumptions={assumptions} />}
                b={<RouteValue route={second} apartment={b} destination={destination} assumptions={assumptions} />}
                difference={delta && (
                  <>
                    <strong>{delta.oneWaySeconds === 0 ? "Equal" : formatDuration(Math.abs(delta.oneWaySeconds)) + " " + direction(delta.oneWaySeconds) + " from B"}</strong>
                    {destination.id === "work" && <p className="apt-note">
                      {delta.morning ? "Weekly morning difference" : "Weekly one-way difference"} · {delta.weeklySeconds === 0 ? "Equal" : formatDuration(Math.abs(delta.weeklySeconds)) + " " + direction(delta.weeklySeconds) + " from B"}
                    </p>}
                  </>
                )}
              />
            );
          })}
          {beforeFilings.map(recordRow)}
          {periods.map((period, index) => {
            const first = selectedPeriod(bugA, period);
            const second = selectedPeriod(bugB, period);
            return (
              <EvidenceRow
                id={index === 0 ? "bedbugs" : undefined}
                key={period.start}
                title={`Annual bedbug filing · ${formatPeriod(period)}`}
                note={<SourceNotes a={bugA?.scope} b={bugB?.scope} provenance={provenance} />}
                a={filingCell(a, bugA, first)} b={filingCell(b, bugB, second)}
                difference={filingDelta(first, second, filingComparable)}
              />
            );
          })}
          {blockMetrics.map(recordRow)}
        </div>
      </section>

      {questions.length > 0 && (
        <section className="apt-questions" aria-labelledby="questions-title">
          <h2 id="questions-title" className="apt-heading">Questions for your tour</h2>
          <ul>
            {questions.map((question) => (
              <li key={question.slot + question.priority}>
                <a className="apt-link" href={`#${question.evidence}`}>Apartment {question.slot}</a>
                <span>{question.text}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

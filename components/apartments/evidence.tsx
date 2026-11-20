import type { ReactNode } from "react";

import { formatDay, formatPeriod } from "@/lib/apartments/calendar";
import { formatCount } from "@/lib/apartments/comparison";
import { sources, type BedbugFiling, type EvidenceScope, type Provenance } from "@/lib/apartments/contracts";

const timestampFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZoneName: "short",
});

export function EvidenceNote({ scope, provenance }: { scope: EvidenceScope; provenance: Provenance }) {
  const source = sources[scope.source];
  return (
    <div className="apt-note">
      <a href={source.url} className="apt-link">
        {provenance === "demo" ? source.name + " documentation" : source.name}
      </a>
      <p>{scope.radiusMeters ? `Within ${scope.radiusMeters} m · ` : ""}{source.definition}</p>
      {scope.window && <p>{formatPeriod(scope.window, true)}</p>}
      {scope.publishedAt && <p>Dataset updated {timestampFormat.format(new Date(scope.publishedAt))}</p>}
      {scope.retrievedAt && (
        <p>{provenance === "demo" ? "Sample snapshot" : "Retrieved"}{" "}
          {timestampFormat.format(new Date(scope.retrievedAt))}
        </p>
      )}
    </div>
  );
}

export function Missing({ label = "Unavailable", reason }: { label?: string; reason?: string }) {
  return (
    <div>
      <span className="apt-missing">{label}</span>
      {reason && <p className="apt-note">{reason}</p>}
    </div>
  );
}

export function RecordCount({ value }: { value: number }) {
  return value === 0
    ? <strong>0 matching records</strong>
    : <strong className="apt-number">{formatCount(value)}</strong>;
}

export function FilingValue({ filing }: { filing?: BedbugFiling }) {
  if (!filing) return <Missing reason="This reporting period is unavailable." />;
  if (filing.status === "no-filing") return <Missing label="No filing found" />;
  if (filing.status === "unavailable") return <Missing reason={filing.reason} />;

  return (
    <div className="apt-filing">
      {filing.infested === null
        ? <Missing reason="The filing has no valid infested-unit count." />
        : <strong>{formatCount(filing.infested)} {filing.infested === 1 ? "unit" : "units"} reported</strong>}
      {filing.total === null
        ? <Missing label="Total units unavailable" reason="The filing has no valid total unit count." />
        : <p>{formatCount(filing.total)} total dwelling units</p>}
      <p className="apt-note">Owner-reported · Filed {formatDay(filing.filedOn)}</p>
    </div>
  );
}

export function ViolationExamples({ examples }: {
  examples: { description?: string; noticeDate?: string }[];
}) {
  if (!examples.length) return null;
  return (
    <details className="apt-examples">
      <summary>See violation notices</summary>
      <ul className="flex list-disc flex-col gap-2 pl-4 text-sm">
        {examples.map((notice, index) => (
          <li key={index}>
            {notice.noticeDate && <span className="font-medium">{formatDay(notice.noticeDate)} </span>}
            {notice.description ?? "Description unavailable"}
          </li>
        ))}
      </ul>
    </details>
  );
}

export function EvidenceRow({ id, title, note, a, b, difference }: {
  id?: string;
  title: string;
  note?: ReactNode;
  a: ReactNode;
  b: ReactNode;
  difference?: ReactNode;
}) {
  return (
    <section className="apt-evidence-row" id={id} aria-label={title}>
      <div className="apt-evidence-label">
        <h3>{title}</h3>
        {note}
      </div>
      <div className="apt-evidence-value">
        <p className="apt-column-label">Apartment A</p>
        {a}
      </div>
      <div className="apt-evidence-value">
        <p className="apt-column-label">Apartment B</p>
        {b}
      </div>
      <div className="apt-evidence-diff">
        <p className="apt-column-label">Difference</p>
        {difference ?? <Missing label="Comparison unavailable" />}
      </div>
    </section>
  );
}

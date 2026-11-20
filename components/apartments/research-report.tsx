"use client";

import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatPeriod } from "@/lib/apartments/calendar";
import { formatRent, parseRent } from "@/lib/apartments/comparison";
import { addressLabel, rentHistoryUrl, type Apartment, type Evidence } from "@/lib/apartments/contracts";

import { EvidenceNote, FilingValue, Missing, RecordCount, ViolationExamples } from "./evidence";

const tabs = [
  { id: "building", title: "Building & Rent" }, { id: "block", title: "Block" },
  { id: "commute", title: "Commute" }, { id: "compare", title: "Compare" },
] as const;

type ReportTab = (typeof tabs)[number]["id"];

function ResearchMetric({ title, evidence, children }: { title: string; evidence: Evidence<unknown>; children: ReactNode }) {
  return (
    <section className="apt-single-metric" aria-label={title}>
      <div>
        <h3 className="font-semibold">{title}</h3>
        <EvidenceNote scope={evidence.scope} provenance="live" />
      </div>
      <div>
        {evidence.status === "available" ? children : <Missing reason={evidence.reason} />}
      </div>
    </section>
  );
}

function CountMetric({ title, evidence }: { title: string; evidence: Evidence<number> }) {
  return (
    <ResearchMetric title={title} evidence={evidence}>
      {evidence.status === "available" && <RecordCount value={evidence.value} />}
    </ResearchMetric>
  );
}

function RentEditor({ cents, save }: { cents?: number; save: (cents?: number) => void }) {
  const [editing, setEditing] = useState(false);
  const [rent, setRent] = useState("");
  const [error, setError] = useState<string>();
  return (
    <section className="apt-single-metric" aria-label="Asking rent">
      <div>
        <h3 className="font-semibold">Asking rent</h3>
        <div className="apt-note">
          <p>User-entered monthly rent</p>
          <a className="apt-link" href={rentHistoryUrl}>Request official apartment rent history</a>
          <p>Tenant request through NYS HCR. The response is mailed to the apartment.</p>
        </div>
      </div>
      <div className="flex flex-col items-start gap-2">
        {cents === undefined ? <Missing label="Not entered" /> : <strong className="apt-number">{formatRent(cents)} <small>/ month</small></strong>}
        {editing ? (
          <form className="flex flex-col gap-2" onSubmit={(event) => {
            event.preventDefault();
            const cents = parseRent(rent);
            if (Number.isNaN(cents)) {
              setError("Enter a monthly rent in dollars and cents.");
              return;
            }
            save(cents);
            setEditing(false);
          }}>
            <label className="text-sm font-semibold">
              Monthly asking rent
              <Input className="mt-1" value={rent} maxLength={25} inputMode="decimal" autoComplete="off"
                aria-invalid={Boolean(error)} onChange={(event) => { setRent(event.target.value); setError(undefined); }} />
            </label>
            {error && <p role="status" className="apt-message">{error}</p>}
            <div className="flex flex-wrap gap-2">
              <Button size="sm">Save rent</Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
            </div>
          </form>
        ) : (
          <Button type="button" size="sm" variant="outline" onClick={() => {
            setRent(cents === undefined ? "" : (cents / 100).toFixed(2));
            setError(undefined);
            setEditing(true);
          }}>Edit asking rent</Button>
        )}
      </div>
    </section>
  );
}

export function ResearchReport({ apartment, saveRent, openCompare, refresh, refreshing, commute }: {
  apartment: Apartment;
  saveRent: (cents?: number) => void;
  openCompare: () => void;
  refresh?: () => void;
  refreshing: boolean;
  commute?: ReactNode;
}) {
  const [selected, setSelected] = useState<Exclude<ReportTab, "compare">>("building");
  const [focused, setFocused] = useState<ReportTab>("building");
  const refs = useRef(new Map<ReportTab, HTMLButtonElement>());
  const id = useId();
  const { address, violations, heat, bedbugs, noise, trees } = apartment.report;

  function handleKeys(event: KeyboardEvent, current: number) {
    const next = {
      ArrowLeft: (current + tabs.length - 1) % tabs.length,
      ArrowRight: (current + 1) % tabs.length,
      Home: 0,
      End: tabs.length - 1,
    }[event.key];
    if (next === undefined) return;
    event.preventDefault();
    setFocused(tabs[next].id);
    refs.current.get(tabs[next].id)?.focus();
  }

  return (
    <article className="apt-research-report" aria-label="Address report">
      <div className="apt-research-heading">
        <div>
          <p className="apt-note" role="status">Confirmed address</p>
          <h2 className="apt-heading">{addressLabel(address)}</h2>
        </div>
        {refresh && <Button type="button" variant="outline" size="sm" onClick={refresh} disabled={refreshing}>
          {refreshing ? "Refreshing records…" : "Retry public records"}
        </Button>}
      </div>
      <div className="apt-tabs" role="tablist" aria-label="Address report sections">
        {tabs.map((tab, index) => (
          <button key={tab.id} id={id + tab.id} type="button" role="tab"
            aria-selected={selected === tab.id} aria-controls={id + "-panel"}
            tabIndex={focused === tab.id ? 0 : -1}
            ref={(button) => { if (button) refs.current.set(tab.id, button); else refs.current.delete(tab.id); }}
            onFocus={() => setFocused(tab.id)}
            onKeyDown={(event) => handleKeys(event, index)}
            onClick={() => tab.id === "compare" ? openCompare() : setSelected(tab.id)}>
            {tab.title}
          </button>
        ))}
      </div>
      <div id={id + "-panel"} role="tabpanel" aria-labelledby={id + selected} tabIndex={0}>
        {selected === "building" && (
          <div className="apt-single-panel">
            <RentEditor key={address.key} cents={apartment.askingRentCents} save={saveRent} />
            <ResearchMetric title="Open HPD violations" evidence={violations}>
              {violations.status === "available" && (
                <div className="apt-pair">
                  {(["B", "C"] as const).map((level) => (
                    <div key={level}>
                      <p className="apt-column-label">Class {level}</p>
                      <RecordCount value={violations.value[level].count} />
                      <ViolationExamples examples={violations.value[level].examples} />
                    </div>
                  ))}
                </div>
              )}
            </ResearchMetric>
            <CountMetric title="Heat and hot-water reports" evidence={heat} />
            <ResearchMetric title="Annual bedbug filings" evidence={bedbugs}>
              {bedbugs.status === "available" && (
                <ul className="apt-filings">
                  {bedbugs.value.map((filing) => (
                    <li key={filing.period.start}>
                      <p className="apt-column-label">{formatPeriod(filing.period)}</p>
                      <FilingValue filing={filing} />
                    </li>
                  ))}
                </ul>
              )}
            </ResearchMetric>
          </div>
        )}
        {selected === "block" && (
          <div className="apt-single-panel">
            <CountMetric title="Nearby noise reports" evidence={noise} />
            <CountMetric title="Populated street tree sites" evidence={trees} />
          </div>
        )}
        {selected === "commute" && (commute ?? <p className="apt-note">In-app route estimates are unavailable.</p>)}
      </div>
    </article>
  );
}

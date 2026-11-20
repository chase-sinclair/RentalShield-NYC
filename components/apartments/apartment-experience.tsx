"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowLeftRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { routeOriginKey, type Slot } from "@/lib/apartments/contracts";

import { AddressFields } from "./address-fields";
import { ApartmentStrip } from "./apartment-strip";
import { ComparisonReport } from "./comparison-report";
import { CommuteForm, ResearchCommutes } from "./commute-controls";
import { DemoWorkspace } from "./demo-workspace";
import { HomeChoices } from "./home-choices";
import { ResearchReport } from "./research-report";
import { useCommutes } from "./use-commutes";
import { needsRetry, useReports } from "./use-reports";

export type ApartmentView = "home" | "research" | "compare" | "demo";

const compareSlots = ["a", "b"] as const;

export function ApartmentExperience({ view, routingEnabled }: { view: ApartmentView; routingEnabled: boolean }) {
  const router = useRouter();
  const reports = useReports(view === "compare");
  const { a, b, research } = reports.entries;
  const originKeys = [a.apartment, b.apartment, research.apartment].flatMap((apartment) =>
    apartment ? [routeOriginKey(apartment.report.address)] : []).sort();
  const commutes = useCommutes(JSON.stringify(originKeys));

  if (view === "home") return <HomeChoices />;
  if (view === "demo") return <DemoWorkspace />;

  function fields(slot: Slot) {
    const entry = reports.entries[slot];
    return (
      <AddressFields slot={slot} entry={entry}
        onChange={(patch) => reports.editDraft(slot, patch)}
        onChoose={(selection) => reports.submit([slot], selection)}
        onCancel={slot !== "research" && entry.apartment ? () => reports.cancelReplace(slot) : undefined} />
    );
  }

  const researchMode = view === "research";
  const comparePending = Boolean(a.pending || b.pending);
  const compareNeedsRefresh = needsRetry(a.apartment) || needsRetry(b.apartment) ||
    a.refreshError || b.refreshError ||
    (a.apartment && b.apartment && a.apartment.report.window.asOf !== b.apartment.report.window.asOf);
  const origins = compareSlots.flatMap((slot) => {
    const apartment = reports.entries[slot].apartment;
    return apartment ? [{ slot, apartment }] : [];
  });

  return (
    <div className="apartment-app">
      <div className="apt-shell apt-workspace">
        <div className="apt-workspace-header">
          <Link className="apt-link inline-flex items-center gap-2" href="/">
            <ArrowLeft className="size-4" aria-hidden="true" /> Home
          </Link>
          <Link className="apt-link" href={researchMode ? "/?tab=compare" : "/?tab=research"}>
            {researchMode ? "Compare Apartments" : "Research an Address"}
          </Link>
        </div>
        <h1 className="apt-heading apt-page-title">{researchMode ? "Research an Address" : "Compare Apartments"}</h1>
        {researchMode ? (
          <>
            <form className="apt-search" noValidate onSubmit={(event) => { event.preventDefault(); reports.submit(["research"]); }}>
              {fields("research")}
              <div className="apt-search-actions">
                <Button disabled={!reports.ready || research.pending === "replace"}>Find address</Button>
              </div>
            </form>
            {research.refreshError && <p role="status" className="apt-message">{research.refreshError}</p>}
            {research.apartment && <ResearchReport
              key={research.apartment.report.address.key}
              apartment={research.apartment} saveRent={reports.setResearchRent}
              openCompare={() => router.push("/?tab=compare")}
              refresh={needsRetry(research.apartment) || research.refreshError ? () => reports.refresh(["research"]) : undefined}
              refreshing={research.pending === "refresh"}
              commute={<ResearchCommutes commutes={commutes} apartment={research.apartment} enabled={routingEnabled} />} />}
          </>
        ) : (
          <>
            <form className="apt-search" noValidate onSubmit={(event) => { event.preventDefault(); reports.submit([...compareSlots]); }}>
              <div className="apt-pair">
                {compareSlots.map((slot) => {
                  const entry = reports.entries[slot];
                  const label = slot === "a" ? "A" : "B";
                  return (
                    <div className="apt-slot" key={slot}>
                      {entry.apartment && <ApartmentStrip apartment={entry.apartment} label={label} actions={
                        !entry.editing && <Button type="button" variant="outline" size="sm" disabled={Boolean(entry.pending)}
                          onClick={() => reports.beginReplace(slot)}>Replace {label}</Button>
                      } />}
                      {entry.editing && fields(slot)}
                    </div>
                  );
                })}
              </div>
              <div className="apt-search-actions">
                {(a.editing || b.editing) && <Button disabled={!reports.ready || comparePending}>
                  {a.editing && b.editing ? "Find apartments" : `Confirm ${a.editing ? "A" : "B"}`}
                </Button>}
                {a.apartment && b.apartment && <Button type="button" size="sm" variant="outline"
                  disabled={comparePending || a.editing || b.editing} onClick={reports.swap}>
                  <ArrowLeftRight aria-hidden="true" /> Swap A/B
                </Button>}
                {reports.baseline && <Button type="button" size="sm" variant="ghost" onClick={reports.clear}>Clear baseline</Button>}
                {compareNeedsRefresh && <Button type="button" size="sm" variant="outline" disabled={comparePending}
                  onClick={() => reports.refresh([...compareSlots])}>
                  {comparePending ? "Refreshing records…" : "Retry public records"}
                </Button>}
                {!a.apartment && !b.apartment && (
                  <Link className="apt-link" href="/?demo=1&tab=compare">Try a sample comparison</Link>
                )}
              </div>
            </form>
            <div aria-live="polite" className="apt-note">
              {a.apartment && <>Apartment A confirmed. </>}{b.apartment && <>Apartment B confirmed. </>}
              {a.refreshError || b.refreshError}
            </div>
            {(a.apartment || b.apartment) && <ComparisonReport a={a.apartment} b={b.apartment}
              destinations={commutes.destinations} assumptions={commutes.assumptions} routes={commutes.results} workdays={commutes.workdays}
              controls={<details className="apt-commute-details">
                <summary>Set commute destinations</summary>
                <CommuteForm commutes={commutes} origins={origins} enabled={routingEnabled} />
              </details>} />}
          </>
        )}
      </div>
    </div>
  );
}

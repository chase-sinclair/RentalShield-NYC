"use client";

import Link from "next/link";
import { useState } from "react";

import { demoApartments, demoDate, demoRoutes, demoWork } from "@/lib/apartments/demo";
import type { RouteAssumptions, TravelMode } from "@/lib/apartments/contracts";

import { ApartmentStrip } from "./apartment-strip";
import { ComparisonReport } from "./comparison-report";

export function DemoWorkspace() {
  const [mode, setMode] = useState<TravelMode>("transit");
  const [workdays, setWorkdays] = useState(5);
  const assumptions: RouteAssumptions = { mode, departure: mode === "transit" ? demoDate : undefined };
  return (
    <div className="apartment-app">
      <div className="apt-shell apt-workspace apt-demo">
        <h1 className="apt-heading apt-page-title">Compare Apartments</h1>
        <div className="apt-sample-bar">
          <strong>Sample comparison</strong>
          <Link className="apt-link" href="/?tab=compare">Exit sample</Link>
        </div>
        <div className="apt-pair">
          <ApartmentStrip apartment={demoApartments[0]} label="A" />
          <ApartmentStrip apartment={demoApartments[1]} label="B" />
        </div>
        <ComparisonReport a={demoApartments[0]} b={demoApartments[1]} destinations={[demoWork]}
          assumptions={assumptions} routes={demoRoutes(assumptions)} workdays={workdays}
          controls={(
            <div className="apt-assumption-controls">
              <label>
                Travel mode
                <select value={mode} onChange={(event) => setMode(event.target.value as TravelMode)}>
                  <option value="transit">Transit</option>
                  <option value="walking">Walking</option>
                </select>
              </label>
              <label>
                Workdays per week
                <select value={workdays} onChange={(event) => setWorkdays(Number(event.target.value))}>
                  {[1, 2, 3, 4, 5, 6, 7].map((days) => <option key={days}>{days}</option>)}
                </select>
              </label>
              <p className="apt-note">Fictional apartments and records. Route times are illustrative.</p>
            </div>
          )}
        />
      </div>
    </div>
  );
}

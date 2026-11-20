import type { ReactNode } from "react";

import { formatRent } from "@/lib/apartments/comparison";
import type { Apartment } from "@/lib/apartments/contracts";

export function ApartmentStrip({ apartment, label, actions }: {
  apartment: Apartment;
  label: "A" | "B";
  actions?: ReactNode;
}) {
  const { address, provenance } = apartment.report;
  return (
    <section className="apt-address-card" aria-label={`Apartment ${label}`}>
      <div className="apt-address-strip">
        <span className="apt-marker" aria-hidden="true">{label}</span>
        <div className="min-w-0">
          <h2>{address.street}</h2>
          <p>{[address.borough, address.zip, provenance === "demo" ? "Fictional address" : ""].filter(Boolean).join(" · ")}</p>
        </div>
        <div className="apt-strip-rent">
          <strong>{apartment.askingRentCents === undefined ? "Rent not entered" : formatRent(apartment.askingRentCents)}</strong>
          {apartment.askingRentCents !== undefined && <small>per month</small>}
        </div>
      </div>
      {actions && <div className="apt-address-actions">{actions}</div>}
    </section>
  );
}

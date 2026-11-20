import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { findRoute, routeMetricTitle } from "@/lib/apartments/comparison";
import { destinationIds, destinationLabels, type Apartment, type Slot, type TravelMode } from "@/lib/apartments/contracts";

import { Assumptions, RouteValue } from "./route-evidence";
import type { CommuteControlsState } from "./use-commutes";

export function CommuteForm({ commutes, origins, enabled }: {
  commutes: CommuteControlsState;
  origins: { slot: Slot; apartment: Apartment }[];
  enabled: boolean;
}) {
  return (
    <form className="apt-commute-form" noValidate onSubmit={(event) => {
      event.preventDefault();
      void commutes.calculate(origins);
    }}>
      <div className="apt-destination-fields">
        {destinationIds.map((id) => (
          <label key={id}>
            {destinationLabels[id]} address
            <Input type="text" maxLength={200} autoComplete="off" value={commutes.rawDestinations[id]}
              placeholder="Street address, city, state or ZIP"
              onChange={(event) => commutes.changeDestination(id, event.target.value)} />
          </label>
        ))}
      </div>
      <div className="apt-route-options">
        <label>
          Travel mode
          <select value={commutes.mode} onChange={(event) => commutes.changeMode(event.target.value as TravelMode)}>
            <option value="transit">Transit</option>
            <option value="walking">Walking</option>
          </select>
        </label>
        {commutes.mode === "transit" && (
          <label>
            Departure (New York time)
            <Input type="datetime-local" value={commutes.departure}
              onChange={(event) => commutes.changeDeparture(event.target.value)} />
          </label>
        )}
        <label>
          Workdays per week
          <select value={commutes.workdays} onChange={(event) => commutes.setWorkdays(Number(event.target.value))}>
            {[1, 2, 3, 4, 5, 6, 7].map((days) => <option key={days}>{days}</option>)}
          </select>
        </label>
      </div>
      <div className="apt-search-actions">
        <Button disabled={!origins.length || commutes.status?.kind === "loading"}>Calculate routes</Button>
        {!enabled && <p className="apt-note">In-app routing is disabled. Enter a destination to open directions in Google Maps.</p>}
      </div>
      <div role="status" aria-live="polite" className={commutes.status?.kind === "error" ? "apt-message" : "apt-note"}>
        {commutes.status?.message}
      </div>
    </form>
  );
}

export function ResearchCommutes({ commutes, apartment, enabled }: {
  commutes: CommuteControlsState;
  apartment: Apartment;
  enabled: boolean;
}) {
  return (
    <div className="flex flex-col gap-4">
      <CommuteForm commutes={commutes} origins={[{ slot: "research", apartment }]} enabled={enabled} />
      {commutes.destinations.length > 0 && (
        <div className="apt-single-panel">
          {commutes.destinations.map((destination) => (
            <section className="apt-single-metric" key={destination.id}>
              <div>
                <h3 className="font-semibold">{routeMetricTitle(destination.id, commutes.assumptions)}</h3>
                <p className="apt-note">{destination.address}</p>
                <Assumptions assumptions={commutes.assumptions} />
              </div>
              <RouteValue route={findRoute(apartment, destination, commutes.assumptions, commutes.results)}
                apartment={apartment} destination={destination} assumptions={commutes.assumptions} />
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

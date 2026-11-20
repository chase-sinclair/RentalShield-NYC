import { formatDeparture } from "@/lib/apartments/calendar";
import { formatDuration } from "@/lib/apartments/comparison";
import { addressLabel, isDestinationAddress, type Apartment, type Destination, type RouteAssumptions, type RouteResult } from "@/lib/apartments/contracts";

import { Missing } from "./evidence";

const routeTimes = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York", dateStyle: "medium", timeStyle: "short",
});

export function Assumptions({ assumptions }: { assumptions: RouteAssumptions }) {
  return (
    <p className="apt-note">
      {assumptions.mode === "transit"
        ? `Transit · ${assumptions.departure ? formatDeparture(assumptions.departure) + " (New York time)" : "Choose a New York departure"}`
        : "Walking · Time-independent estimate"}
    </p>
  );
}

export function RouteValue({ route, apartment, destination, assumptions }: {
  route?: RouteResult;
  apartment?: Apartment;
  destination: Destination;
  assumptions: RouteAssumptions;
}) {
  if (route?.status === "available") {
    return (
      <div className="flex flex-col gap-1">
        <strong className="apt-number">{formatDuration(route.seconds)}</strong>
        {route.provenance === "demo" ? (
          <p className="apt-note"><strong>Sample estimate</strong></p>
        ) : (
          <p className="apt-note apt-google" translate="no">Google Maps</p>
        )}
        {!!route.lines?.length && <p className="apt-note">{route.lines.join(" · ")}</p>}
        {route.retrievedAt && <p className="apt-note">Estimated {routeTimes.format(new Date(route.retrievedAt))} (New York time)</p>}
        {route.provenance === "live" && assumptions.mode === "walking" && (
          <p className="apt-note">Walking routes are in beta and might be missing clear sidewalks or pedestrian paths.</p>
        )}
      </div>
    );
  }

  if (!apartment) return <Missing label="Apartment needed" />;
  if (apartment.report.provenance === "demo") return <Missing />;
  if (!isDestinationAddress(destination.address)) return <Missing label="Complete the destination address" />;
  const params = new URLSearchParams({
    api: "1",
    origin: addressLabel(apartment.report.address),
    destination: destination.address,
    travelmode: assumptions.mode,
  });
  return (
    <div className="flex flex-col gap-2">
      <Missing label={route ? "Unavailable" : "Not calculated"} reason={route?.reason} />
      <a className="apt-link text-sm" href={`https://www.google.com/maps/dir/?${params}`} rel="noreferrer" target="_blank">
        Open directions in Google Maps
      </a>
    </div>
  );
}

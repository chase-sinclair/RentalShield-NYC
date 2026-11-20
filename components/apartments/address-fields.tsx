import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Slot } from "@/lib/apartments/contracts";

import type { AddressDraft, SlotState } from "./report-state";

const labels: Record<Slot, string> = { a: "Apartment A", b: "Apartment B", research: "Apartment address" };

export function AddressFields({ slot, entry, onChange, onChoose, onCancel }: {
  slot: Slot;
  entry: SlotState;
  onChange: (patch: Partial<AddressDraft>) => void;
  onChoose: (selection: string) => void;
  onCancel?: () => void;
}) {
  const base = `apt-${slot}`;
  const issueId = base + "-issue";
  const busy = entry.pending === "replace";
  return (
    <fieldset className="apt-fieldset" aria-describedby={entry.issue ? issueId : undefined}>
      {slot !== "research" && <legend>{labels[slot]}</legend>}
      <div className="apt-address-fields">
        <label>
          Street address
          <Input name={base + "-street"} value={entry.draft.street} maxLength={160}
            placeholder="House number and street" autoComplete="off"
            aria-invalid={entry.issue?.status === "invalid" || entry.issue?.status === "unmatched"}
            onChange={(event) => onChange({ street: event.target.value })} />
        </label>
        <label>
          Borough or ZIP
          <Input name={base + "-area"} value={entry.draft.area} maxLength={40}
            placeholder="e.g. Queens or 11109" autoComplete="off"
            onChange={(event) => onChange({ area: event.target.value })} />
        </label>
        <label>
          Asking rent <span>(optional, monthly USD)</span>
          <Input name={base + "-rent"} value={entry.draft.rent} maxLength={25}
            placeholder="e.g. 2650" inputMode="decimal"
            onChange={(event) => onChange({ rent: event.target.value })} />
        </label>
      </div>
      <div aria-live="polite" aria-atomic="true">
        {busy && <p className="apt-note">Looking up {slot === "research" ? "the address" : labels[slot]} and checking city records…</p>}
        {entry.issue && <p id={issueId} className="apt-message">{entry.issue.message}</p>}
      </div>
      {entry.issue?.status === "choose" && (
        <ul className="apt-candidates">
          {entry.issue.candidates.map((candidate, index, all) => {
            const sharedLabel = all.some((other, otherIndex) => otherIndex !== index && other.label === candidate.label);
            const identifier = sharedLabel ? ` · ${candidate.bin ? "BIN " + candidate.bin : "Building option " + (index + 1)}` : "";
            return (
              <li key={candidate.key}>
                <Button type="button" variant="outline" size="sm" onClick={() => onChoose(candidate.key)}>
                  {candidate.label}{identifier}
                </Button>
              </li>
            );
          })}
        </ul>
      )}
      {onCancel && (
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>Cancel replacement</Button>
      )}
    </fieldset>
  );
}

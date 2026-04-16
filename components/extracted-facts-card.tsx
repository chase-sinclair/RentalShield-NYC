import type { ExtractedFacts } from "@/types";

import { SectionCard } from "@/components/section-card";

interface ExtractedFactsCardProps {
  facts: ExtractedFacts;
}

export function ExtractedFactsCard({ facts }: ExtractedFactsCardProps) {
  const entries = [
    ["Address", facts.address ?? "Unavailable"],
    ["Borough", facts.borough ?? "Unavailable"],
    ["Neighborhood", facts.neighborhood ?? "Unavailable"],
    ["Claimed rent", facts.claimedRent ? `$${facts.claimedRent.toLocaleString()}` : "Unavailable"],
    ["Broker", facts.brokerName ?? "Unavailable"],
    ["Company", facts.company ?? "Unavailable"],
    ["Payment method", facts.paymentMethod ?? "Unavailable"],
  ];

  return (
    <SectionCard
      eyebrow="Extraction"
      title="Extracted facts"
      description="This section shows what the current pipeline inferred from the listing, message text, and screenshots."
    >
      <div className="grid gap-3 sm:grid-cols-2">
        {entries.map(([label, value]) => (
          <div className="rounded-2xl border border-border bg-secondary/40 px-4 py-3" key={label}>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
            <p className="mt-2 text-sm font-medium text-foreground">{value}</p>
          </div>
        ))}
      </div>

      {(facts.urgencySignals.length > 0 || facts.tourLimitations.length > 0) ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-border bg-secondary/35 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Urgency Signals
            </p>
            <div className="mt-3 space-y-2">
              {facts.urgencySignals.length ? (
                facts.urgencySignals.map((item) => (
                  <p className="text-sm leading-6 text-foreground" key={item}>
                    {item}
                  </p>
                ))
              ) : (
                <p className="text-sm leading-6 text-muted-foreground">No urgency language extracted.</p>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-secondary/35 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Tour Limitations
            </p>
            <div className="mt-3 space-y-2">
              {facts.tourLimitations.length ? (
                facts.tourLimitations.map((item) => (
                  <p className="text-sm leading-6 text-foreground" key={item}>
                    {item}
                  </p>
                ))
              ) : (
                <p className="text-sm leading-6 text-muted-foreground">No tour limitations extracted.</p>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </SectionCard>
  );
}

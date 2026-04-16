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
    </SectionCard>
  );
}

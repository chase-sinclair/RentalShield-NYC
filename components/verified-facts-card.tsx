import type { VerifiedFact } from "@/types";

import { SectionCard } from "@/components/section-card";

interface VerifiedFactsCardProps {
  facts: VerifiedFact[];
}

export function VerifiedFactsCard({ facts }: VerifiedFactsCardProps) {
  return (
    <SectionCard
      eyebrow="Evidence"
      title="Verified facts"
      description="These facts are intended to represent signals the system could support with a specific source or tool output."
    >
      <div className="space-y-3">
        {facts.map((fact) => (
          <div className="rounded-2xl border border-border bg-secondary/35 px-4 py-4" key={`${fact.label}-${fact.value}`}>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="font-semibold text-foreground">{fact.label}</p>
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{fact.source}</p>
            </div>
            <p className="mt-2 text-sm text-foreground">{fact.value}</p>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

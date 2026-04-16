import type { RankedFactor } from "@/types";

import { SectionCard } from "@/components/section-card";

interface FactorExplanationsProps {
  factors: RankedFactor[];
}

export function FactorExplanations({ factors }: FactorExplanationsProps) {
  return (
    <SectionCard
      eyebrow="Explainability"
      title="Ranked risk factors"
      description="Factors are ordered by contribution so users can see which signals shaped the current score most."
    >
      <div className="space-y-3">
        {factors.map((factor) => (
          <div className="rounded-[1.4rem] border border-border bg-secondary/35 p-4" key={factor.title}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="font-semibold text-foreground">{factor.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{factor.explanation}</p>
              </div>
              <div className="rounded-full bg-white px-3 py-2 text-sm font-semibold text-foreground shadow-sm">
                +{factor.contribution}
              </div>
            </div>
            <p className="mt-3 text-xs uppercase tracking-[0.22em] text-muted-foreground">
              Severity: {factor.severity} • Evidence: {factor.evidenceSource}
            </p>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

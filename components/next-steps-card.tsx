import { Shield, SearchCheck } from "lucide-react";

import { SectionCard } from "@/components/section-card";

interface NextStepsCardProps {
  steps: string[];
  unverifiedOrMissing: string[];
}

export function NextStepsCard({ steps, unverifiedOrMissing }: NextStepsCardProps) {
  return (
    <SectionCard
      eyebrow="Safety"
      title="Recommended next steps"
      description="The MVP should guide users toward safer verification behavior instead of making overconfident claims."
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-[1.4rem] border border-border bg-secondary/35 p-4">
          <div className="flex items-center gap-3">
            <Shield className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-foreground">What to do next</h3>
          </div>
          <div className="mt-4 space-y-3">
            {steps.map((step) => (
              <p className="text-sm leading-6 text-muted-foreground" key={step}>
                {step}
              </p>
            ))}
          </div>
        </div>

        <div className="rounded-[1.4rem] border border-border bg-secondary/35 p-4">
          <div className="flex items-center gap-3">
            <SearchCheck className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-foreground">What still needs verification</h3>
          </div>
          <div className="mt-4 space-y-3">
            {unverifiedOrMissing.map((item) => (
              <p className="text-sm leading-6 text-muted-foreground" key={item}>
                {item}
              </p>
            ))}
          </div>
        </div>
      </div>
    </SectionCard>
  );
}

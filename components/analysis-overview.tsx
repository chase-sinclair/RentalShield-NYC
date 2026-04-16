import { ShieldAlert, Waypoints } from "lucide-react";

import { SectionCard } from "@/components/section-card";

interface AnalysisOverviewProps {
  scopeNotes: string[];
  unavailableChecks: string[];
  checksRun: string[];
}

export function AnalysisOverview({
  scopeNotes,
  unavailableChecks,
  checksRun,
}: AnalysisOverviewProps) {
  return (
    <SectionCard
      eyebrow="Assessment"
      title="How this estimate was built"
      description="RentalShield NYC separates completed checks, scope limits, and unavailable verification steps so users can understand the reliability of the result."
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-[1.4rem] border border-border bg-secondary/35 p-4">
          <div className="flex items-center gap-3">
            <Waypoints className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-foreground">Scope and completed checks</h3>
          </div>
          <div className="mt-4 space-y-3">
            {scopeNotes.map((note) => (
              <p className="text-sm leading-6 text-muted-foreground" key={note}>
                {note}
              </p>
            ))}
            <p className="text-sm leading-6 text-foreground">
              Checks run: {checksRun.join(", ") || "No checks completed."}
            </p>
          </div>
        </div>

        <div className="rounded-[1.4rem] border border-border bg-secondary/35 p-4">
          <div className="flex items-center gap-3">
            <ShieldAlert className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-foreground">Unavailable or limited checks</h3>
          </div>
          <div className="mt-4 space-y-3">
            {unavailableChecks.length ? (
              unavailableChecks.map((check) => (
                <p className="text-sm leading-6 text-muted-foreground" key={check}>
                  {check}
                </p>
              ))
            ) : (
              <p className="text-sm leading-6 text-muted-foreground">
                No currently wired checks were marked unavailable for this submission.
              </p>
            )}
          </div>
        </div>
      </div>
    </SectionCard>
  );
}

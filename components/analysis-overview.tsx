import { ShieldAlert, Waypoints } from "lucide-react";

import { SectionCard } from "@/components/section-card";

interface AnalysisOverviewProps {
  scopeNotes: string[];
  unavailableChecks: string[];
  systemNotes: string[];
  checksRun: string[];
}

const CHECK_LABELS: Record<string, string> = {
  broker_verification_tool: "Contact identity verification could not fully run from the submitted details.",
  ocr_or_multimodal_extraction_tool: "Screenshot extraction had limited or unavailable coverage.",
  message_extraction_tool: "Message extraction had limited or unavailable coverage.",
  risk_scoring_tool: "Risk scoring had limited or unavailable coverage.",
  address_verification_tool: "Address verification had limited or unavailable coverage.",
  rent_comparison_tool: "Rent comparison had limited or unavailable coverage.",
};

function formatCheckLabel(check: string) {
  return CHECK_LABELS[check] ?? check.replaceAll("_", " ");
}

export function AnalysisOverview({
  scopeNotes,
  unavailableChecks,
  systemNotes,
  checksRun,
}: AnalysisOverviewProps) {
  return (
    <SectionCard
      eyebrow="Assessment"
      title="How this estimate was built"
      description="RentalShield NYC separates completed checks, scope limits, and unavailable verification steps so users can understand the reliability of the result."
    >
      <div className="grid gap-4 lg:grid-cols-3">
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
                  {formatCheckLabel(check)}
                </p>
              ))
            ) : (
              <p className="text-sm leading-6 text-muted-foreground">
                No currently wired checks were marked as unavailable or degraded for this submission.
              </p>
            )}
          </div>
        </div>

        <div className="rounded-[1.4rem] border border-border bg-secondary/35 p-4">
          <div className="flex items-center gap-3">
            <ShieldAlert className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-foreground">System and provider notes</h3>
          </div>
          <div className="mt-4 space-y-3">
            {systemNotes.length ? (
              systemNotes.map((note) => (
                <p className="text-sm leading-6 text-muted-foreground" key={note}>
                  {note}
                </p>
              ))
            ) : (
              <p className="text-sm leading-6 text-muted-foreground">
                No additional provider or system notes were recorded for this submission.
              </p>
            )}
          </div>
        </div>
      </div>
    </SectionCard>
  );
}

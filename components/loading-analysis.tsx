import { LoaderCircle } from "lucide-react";

import { Card } from "@/components/ui/card";

const steps = [
  "Extracting listing and message details",
  "Reviewing screenshot evidence",
  "Verifying Manhattan address signals",
  "Checking rent context",
  "Assembling explainable risk factors",
];

interface LoadingAnalysisProps {
  summary?: string;
}

export function LoadingAnalysis({
  summary = "The scaffolded flow uses mock results now, with the UI ready for real tool execution later.",
}: LoadingAnalysisProps) {
  return (
    <Card className="space-y-6">
      <div className="flex items-center gap-3">
        <LoaderCircle className="h-5 w-5 animate-spin text-primary" />
        <div>
          <h2 className="text-lg font-semibold">Reviewing your evidence</h2>
          <p className="text-sm text-muted-foreground">{summary}</p>
        </div>
      </div>

      <div className="space-y-3">
        {steps.map((step) => (
          <div className="rounded-2xl border border-border bg-secondary/50 px-4 py-3 text-sm" key={step}>
            {step}
          </div>
        ))}
      </div>
    </Card>
  );
}

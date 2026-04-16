import { formatPercent, formatRiskLabel } from "@/lib/utils/format";
import type { ScamRiskLabel } from "@/types";

import { Card } from "@/components/ui/card";

interface ScoreDisplayProps {
  score: number;
  label: ScamRiskLabel;
  summary: string;
}

const labelStyles: Record<ScamRiskLabel, string> = {
  low: "bg-emerald-100 text-emerald-900",
  medium: "bg-amber-100 text-amber-900",
  high: "bg-red-100 text-red-900",
};

export function ScoreDisplay({ score, label, summary }: ScoreDisplayProps) {
  return (
    <Card className="overflow-hidden p-0">
      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        <div className="bg-primary px-6 py-8 text-primary-foreground">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary-foreground/70">
            Scam Risk Score
          </p>
          <p className="mt-3 text-6xl font-semibold leading-none">{score}</p>
          <p className="mt-4 text-sm text-primary-foreground/80">{formatPercent(score)} estimated concern level</p>
        </div>
        <div className="px-6 py-8">
          <span className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${labelStyles[label]}`}>
            {formatRiskLabel(label)} Risk
          </span>
          <h2 className="mt-4 text-2xl font-semibold text-foreground">Risk summary</h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">{summary}</p>
        </div>
      </div>
    </Card>
  );
}

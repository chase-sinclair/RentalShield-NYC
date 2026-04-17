import { formatPercent, formatRiskLabel } from "@/lib/utils/format";
import type { ScamRiskLabel } from "@/types";

import { Card } from "@/components/ui/card";

interface ScoreDisplayProps {
  score: number;
  label: ScamRiskLabel;
  summary: string;
  confidenceNote: string;
  configuredModelId: string;
  modelIdUsed: string;
}

const labelStyles: Record<ScamRiskLabel, string> = {
  low: "bg-emerald-100 text-emerald-900",
  medium: "bg-amber-100 text-amber-900",
  high: "bg-red-100 text-red-900",
};

function getGaugeRotation(score: number) {
  const clamped = Math.max(0, Math.min(100, score));
  return -90 + clamped * 1.8;
}

export function ScoreDisplay({
  score,
  label,
  summary,
  confidenceNote,
  configuredModelId,
  modelIdUsed,
}: ScoreDisplayProps) {
  const usedFallback = modelIdUsed.includes("fallback");
  const gaugeRotation = getGaugeRotation(score);

  return (
    <Card className="overflow-hidden p-0">
      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <div className="bg-primary px-6 py-8 text-primary-foreground">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary-foreground/70">
            Scam Risk Score
          </p>
          <p className="mt-3 text-6xl font-semibold leading-none">{score}</p>
          <p className="mt-4 text-sm text-primary-foreground/80">{formatPercent(score)} estimated concern level</p>
          <div className="mt-8">
            <div className="relative mx-auto w-full max-w-[220px]">
              <div className="relative h-[118px] overflow-hidden">
                <div className="absolute inset-x-0 top-0 mx-auto h-[220px] w-[220px] rounded-full bg-[conic-gradient(from_180deg,_#22c55e_0deg,_#22c55e_60deg,_#facc15_60deg,_#facc15_120deg,_#ef4444_120deg,_#ef4444_180deg,_transparent_180deg)]" />
                <div className="absolute inset-x-0 top-[22px] mx-auto h-[176px] w-[176px] rounded-full bg-primary" />
                <div
                  className="absolute left-1/2 top-[106px] h-[3px] w-[74px] origin-left rounded-full bg-white shadow-[0_0_0_3px_rgba(15,23,42,0.12)]"
                  style={{ transform: `rotate(${gaugeRotation}deg)` }}
                />
                <div className="absolute left-1/2 top-[106px] h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-primary bg-white" />
              </div>
              <div className="mt-1 flex items-center justify-between px-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary-foreground/72">
                <span>Low</span>
                <span>Medium</span>
                <span>High</span>
              </div>
            </div>
          </div>
        </div>
        <div className="px-6 py-8">
          <span className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${labelStyles[label]}`}>
            {formatRiskLabel(label)} Risk
          </span>
          <h2 className="mt-4 text-2xl font-semibold text-foreground">Risk summary</h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">{summary}</p>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl border border-border bg-secondary/35 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                Confidence framing
              </p>
              <p className="mt-2 text-sm leading-6 text-foreground">{confidenceNote}</p>
            </div>
            <div className="rounded-2xl border border-border bg-secondary/35 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                Execution mode
              </p>
              <p className="mt-2 break-all text-sm leading-6 text-foreground">
                {usedFallback ? "Fallback logic was used for the final risk score." : modelIdUsed}
              </p>
              <p className="mt-2 break-all text-xs leading-5 text-muted-foreground">
                Configured primary model: {configuredModelId}
              </p>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

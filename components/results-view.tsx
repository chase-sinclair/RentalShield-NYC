import { AnalysisOverview } from "@/components/analysis-overview";
import { DisclaimerBanner } from "@/components/disclaimer-banner";
import { ExtractedFactsCard } from "@/components/extracted-facts-card";
import { FactorExplanations } from "@/components/factor-explanations";
import { NextStepsCard } from "@/components/next-steps-card";
import { ScoreDisplay } from "@/components/score-display";
import { VerifiedFactsCard } from "@/components/verified-facts-card";
import type { AnalysisResult } from "@/types";

interface ResultsViewProps {
  result: AnalysisResult;
}

export function ResultsView({ result }: ResultsViewProps) {
  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
      <ScoreDisplay
        confidenceNote={result.confidenceNote}
        label={result.label}
        modelIdUsed={result.modelIdUsed}
        score={result.score}
        summary={result.summary}
      />
      <AnalysisOverview
        checksRun={result.checksRun}
        scopeNotes={result.scopeNotes}
        unavailableChecks={result.unavailableChecks}
      />
      <ExtractedFactsCard facts={result.extractedFacts} />
      <FactorExplanations factors={result.rankedFactors} />
      <VerifiedFactsCard facts={result.verifiedFacts} />
      <NextStepsCard
        steps={result.recommendedNextSteps}
        unverifiedOrMissing={result.unverifiedOrMissing}
      />
      <DisclaimerBanner />
    </div>
  );
}

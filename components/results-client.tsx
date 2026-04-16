"use client";

import { useEffect, useState } from "react";

import { ErrorState } from "@/components/error-state";
import { LoadingAnalysis } from "@/components/loading-analysis";
import { ResultsView } from "@/components/results-view";
import { MOCK_RESULT_ID, mockAnalysisResult } from "@/lib/analysis/mock-data";
import { loadAnalysisResult } from "@/lib/utils/analysis-storage";
import type { AnalysisResult } from "@/types";

interface ResultsClientProps {
  id: string;
}

export function ResultsClient({ id }: ResultsClientProps) {
  const [result, setResult] = useState<AnalysisResult | null>(() =>
    id === MOCK_RESULT_ID ? mockAnalysisResult : null,
  );
  const [isReady, setIsReady] = useState(id === MOCK_RESULT_ID);

  useEffect(() => {
    if (id === MOCK_RESULT_ID) {
      return;
    }

    const stored = loadAnalysisResult(id);
    setResult(stored);
    setIsReady(true);
  }, [id]);

  if (!isReady) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
        <LoadingAnalysis summary="Loading the analysis you just generated from the current browser session." />
      </div>
    );
  }

  if (!result) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
        <ErrorState
          title="Analysis not available"
          description="This result is not stored in the current browser session yet. Re-run the analysis from the form to regenerate it."
        />
      </div>
    );
  }

  return <ResultsView result={result} />;
}

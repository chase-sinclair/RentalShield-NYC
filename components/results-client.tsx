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
  initialResult?: AnalysisResult | null;
}

export function ResultsClient({ id, initialResult = null }: ResultsClientProps) {
  const [result, setResult] = useState<AnalysisResult | null>(() =>
    id === MOCK_RESULT_ID ? mockAnalysisResult : initialResult,
  );
  const [isReady, setIsReady] = useState(id === MOCK_RESULT_ID || Boolean(initialResult));

  useEffect(() => {
    if (id === MOCK_RESULT_ID || initialResult) {
      return;
    }

    const stored = loadAnalysisResult(id);
    setResult(stored);
    setIsReady(true);
  }, [id, initialResult]);

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
          description="This result was not found in Supabase or the current browser session. Re-run the analysis from the form to regenerate it."
        />
      </div>
    );
  }

  return <ResultsView result={result} />;
}

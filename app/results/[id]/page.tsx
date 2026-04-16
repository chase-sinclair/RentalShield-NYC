import { getPersistedAnalysisResult } from "@/lib/analysis/persistence";
import { ResultsClient } from "@/components/results-client";

interface ResultsPageProps {
  params: Promise<{ id: string }>;
}

export default async function ResultsPage({ params }: ResultsPageProps) {
  const { id } = await params;
  const persistedResult = await getPersistedAnalysisResult(id);

  return <ResultsClient id={id} initialResult={persistedResult} />;
}

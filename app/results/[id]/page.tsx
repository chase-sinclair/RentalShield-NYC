import { ResultsClient } from "@/components/results-client";

interface ResultsPageProps {
  params: Promise<{ id: string }>;
}

export default async function ResultsPage({ params }: ResultsPageProps) {
  const { id } = await params;

  return <ResultsClient id={id} />;
}

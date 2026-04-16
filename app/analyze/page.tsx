import { AnalysisForm } from "@/components/analysis-form";
import { LoadingAnalysis } from "@/components/loading-analysis";
import { SectionCard } from "@/components/section-card";

export default function AnalyzePage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
      <SectionCard
        eyebrow="Analysis"
        title="Analyze a rental listing"
        description="This dedicated page will eventually host the full submission and extraction-review flow. For the scaffold, it demonstrates the intended structure, loading patterns, and reusable form components."
      >
        <AnalysisForm />
      </SectionCard>

      <LoadingAnalysis summary="Submitting this form now sends a real request to the analyze API and routes to a request-specific results page backed by mock services." />
    </div>
  );
}

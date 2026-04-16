import { AnalysisForm } from "@/components/analysis-form";
import { LoadingAnalysis } from "@/components/loading-analysis";
import { SectionCard } from "@/components/section-card";

export default function AnalyzePage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
      <SectionCard
        eyebrow="Analysis"
        title="Analyze a rental listing"
        description="Use this page when you want the full submission flow with listing input, message evidence, screenshots, validation, and the current explainable Manhattan-focused scoring pipeline."
      >
        <AnalysisForm />
      </SectionCard>

      <LoadingAnalysis summary="Submitting this form sends a real analysis request, optionally persists the result, and routes to a result page that can load from Supabase or the current browser session." />
    </div>
  );
}

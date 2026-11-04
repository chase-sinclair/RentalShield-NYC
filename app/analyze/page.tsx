import { AnalysisForm } from "@/components/analysis-form";
import { LoadingAnalysis } from "@/components/loading-analysis";
import { SectionCard } from "@/components/section-card";

export default function AnalyzePage() {
  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
      <SectionCard
        eyebrow="Analysis"
        title="Choose the path that matches your situation"
        description="Start with a quick listing gut-check or a deeper contact-message review. Both paths use the same analysis pipeline and preserve your evidence as you move through the form."
      >
        <AnalysisForm />
      </SectionCard>

      <LoadingAnalysis summary="Submitting this form sends a real analysis request, optionally persists the result, and routes to a result page that can load from Supabase or the current browser session." />
    </div>
  );
}

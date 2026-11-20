import { DisclaimerBanner } from "@/components/disclaimer-banner";
import { SectionCard } from "@/components/section-card";

export default function DisclaimerPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
      <SectionCard
        eyebrow="Disclaimer"
        title="Important limitations"
        description="The scaffold includes trust-oriented language from day one so the MVP does not overstate certainty."
      >
        <DisclaimerBanner />
      </SectionCard>

      <SectionCard
        eyebrow="Scope"
        title="Scam checker coverage"
        description="The scam checker is optimized for Manhattan. Message-based checks are available for listings elsewhere, where property-specific verification may be limited."
      >
        <div className="space-y-3 text-sm leading-7 text-muted-foreground">
          <p>
            RentalShield NYC is an informational product, not a legal service. Users should still
            independently verify the property, the identity of the broker or landlord, and the lease process.
          </p>
          <p>
            External checks for geocoding, rent comparison, license lookup, OCR, and Bedrock scoring
            now have live integration paths with graceful fallback behavior, but they should still be
            treated as informational signals rather than legal or factual guarantees.
          </p>
        </div>
      </SectionCard>
    </div>
  );
}

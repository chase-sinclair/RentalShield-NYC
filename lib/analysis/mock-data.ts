import type { AnalysisResult } from "@/types";

export const MOCK_RESULT_ID = "mock-manhattan-demo";

export const mockAnalysisResult: AnalysisResult = {
  id: MOCK_RESULT_ID,
  score: 74,
  label: "high",
  summary:
    "Several scam indicators were detected, including pressure-heavy language, a likely below-market rent, and incomplete broker verification.",
  confidenceNote:
    "This estimate is useful for screening, but some checks remain mocked or partially unavailable, so it should not replace independent verification.",
  systemNotes: [
    "This sample result uses demo-ready fallback data in parts of the analysis pipeline.",
  ],
  rankedFactors: [
    {
      title: "Quoted rent appears meaningfully below neighborhood context",
      severity: "high",
      contribution: 26,
      explanation:
        "The claimed price is noticeably below the current mock Manhattan rent context for comparable listings.",
      evidenceSource: "tool",
    },
    {
      title: "Message language includes urgency and payment pressure",
      severity: "high",
      contribution: 19,
      explanation:
        "The text references immediate deposit timing and limited availability without standard verification details.",
      evidenceSource: "message",
    },
    {
      title: "Broker identity could not be confidently verified",
      severity: "medium",
      contribution: 14,
      explanation:
        "Only partial agent details were available, so the claimed broker could not be matched with high confidence.",
      evidenceSource: "tool",
    },
  ],
  verifiedFacts: [
    {
      label: "Address",
      value: "245 W 73rd St, New York, NY 10023",
      source: "Address verification tool",
    },
    {
      label: "Borough",
      value: "Manhattan",
      source: "Geocoding",
    },
    {
      label: "Claimed rent",
      value: "$2,650",
      source: "Listing parser + message extraction",
    },
  ],
  unverifiedOrMissing: [
    "No independently verified unit availability source was connected yet.",
    "OCR confidence remains mocked until screenshot extraction is wired to Bedrock.",
  ],
  recommendedNextSteps: [
    "Request an in-person or verified live virtual tour before sending funds.",
    "Verify the broker license independently through New York state licensing tools.",
    "Confirm lease terms, address, and payment instructions before sharing personal information.",
  ],
  scopeNotes: [
    "This sample result reflects the Manhattan-focused MVP flow.",
    "Some checks in the sample remain mocked to preserve demo readiness before all providers are wired live.",
  ],
  extractedFacts: {
    address: "245 W 73rd St",
    borough: "Manhattan",
    neighborhood: "Upper West Side",
    claimedRent: 2650,
    contactRole: "broker_agent",
    brokerName: "Daniel M.",
    company: "Metro Prime Leasing",
    contactEmail: "daniel@metroprimeleasing.com",
    contactPhone: "(212) 555-0119",
    paymentMethod: "Zelle",
    urgencySignals: ["Immediate deposit requested", "Another renter is ready today"],
    tourLimitations: ["Unable to show until deposit clears"],
  },
  normalizedAddress: "245 W 73rd St, New York, NY 10023",
  borough: "Manhattan",
  neighborhood: "Upper West Side",
  extractedRent: 2650,
  extractedContactRole: "broker_agent",
  extractedBrokerName: "Daniel M.",
  extractedCompany: "Metro Prime Leasing",
  configuredModelId: "anthropic.claude-3-7-sonnet-20250219-v1:0",
  modelIdUsed: "anthropic.claude-3-7-sonnet-20250219-v1:0",
  disclaimer:
    "RentalShield NYC provides an informational risk estimate based on the evidence you submit. It does not provide legal advice, guarantee that a listing is legitimate, or replace independent verification.",
  checksRun: [
    "listing_parser_tool",
    "message_extraction_tool",
    "ocr_or_multimodal_extraction_tool",
    "address_verification_tool",
    "rent_comparison_tool",
    "risk_scoring_tool",
  ],
  unavailableChecks: ["broker_verification_tool"],
  createdAt: "2026-04-16T12:00:00.000Z",
};

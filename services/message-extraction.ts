import type { AnalysisInput } from "@/types";

export async function extractMessageSignals(input: Pick<AnalysisInput, "messageText">) {
  // TODO: Replace heuristics with Bedrock-backed structured extraction.
  const raw = input.messageText ?? "";
  const urgencySignals = raw ? ["Mentions immediate action", "References competing renter pressure"] : [];

  return {
    brokerName: "Daniel M.",
    company: "Metro Prime Leasing",
    paymentMethod: raw ? "Zelle" : undefined,
    urgencySignals,
    tourLimitations: raw ? ["Claims unit cannot be shown until deposit is sent"] : [],
  };
}

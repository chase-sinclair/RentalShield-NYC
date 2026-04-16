import type { AnalysisInput } from "@/types";

export async function parseListing(input: Pick<AnalysisInput, "listingUrl" | "manualRent">) {
  // TODO: Add listing-site-specific retrieval and structured parsing.
  return {
    title: "Sunny one-bedroom near Riverside Park",
    address: "245 W 73rd St",
    extractedRent: input.manualRent ?? 2650,
    sourceUrl: input.listingUrl,
    notes: ["Using scaffolded mock parser output until provider integrations are selected."],
  };
}

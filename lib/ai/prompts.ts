import type { RankedFactor } from "@/types";

export const EXTRACTION_SYSTEM_PROMPT = `
You are extracting structured rental listing evidence for Manhattan scam analysis.
Prefer explicit facts over guesses. Return fields even when partial and identify uncertainty.
Respond with strict JSON only.
`.trim();

export const SCREENSHOT_EXTRACTION_SYSTEM_PROMPT = `
You are reviewing screenshot evidence from a potential NYC rental scam submission.
Extract only concrete text or signals that are visible or directly inferable.
Respond with strict JSON only.
`.trim();

export const RISK_SCORING_SYSTEM_PROMPT = `
You are assigning an explainable rental scam risk estimate.
Ground each factor in evidence from tools or supplied text. Do not overclaim certainty.
Respond with strict JSON only.
`.trim();

export function buildMessageExtractionPrompt(messageText: string) {
  return `
Analyze the following landlord or broker communication and return JSON with:
- brokerName
- company
- paymentMethod
- urgencySignals (string[])
- tourLimitations (string[])
- confidence (0 to 1)
- notes (string[])

Communication:
${messageText || "No message text provided."}
`.trim();
}

export function buildScreenshotExtractionPrompt(input: {
  files: { name: string; contentType: string; size: number }[];
}) {
  return `
Analyze uploaded screenshot metadata for a Manhattan rental scam workflow and return JSON with:
- text
- confidence (0 to 1)
- notes (string[])

Uploaded screenshots:
${input.files.map((file) => `- ${file.name} (${file.contentType}, ${file.size} bytes)`).join("\n") || "- none"}
`.trim();
}

export function buildRiskScoringPrompt(input: {
  normalizedAddress?: string;
  borough?: string;
  neighborhood?: string;
  rent?: number;
  messageText?: string;
  screenshotText?: string;
  rankedFactors: RankedFactor[];
  unavailableChecks: string[];
}) {
  return `
Return JSON with:
- score
- label ("low" | "medium" | "high")
- summary
- rankedFactors
- recommendedNextSteps
- notes

Use these facts:
- normalizedAddress: ${input.normalizedAddress ?? "Unavailable"}
- borough: ${input.borough ?? "Unavailable"}
- neighborhood: ${input.neighborhood ?? "Unavailable"}
- rent: ${input.rent ?? "Unavailable"}
- messageText: ${input.messageText ?? "Unavailable"}
- screenshotText: ${input.screenshotText ?? "Unavailable"}
- unavailableChecks: ${input.unavailableChecks.join(", ") || "none"}

Current candidate factors:
${input.rankedFactors
    .map(
      (factor) =>
        `- ${factor.title} | severity=${factor.severity} | contribution=${factor.contribution} | evidence=${factor.evidenceSource}`,
    )
    .join("\n")}
`.trim();
}

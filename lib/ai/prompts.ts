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

Rules:
- Use null when brokerName or company are not stated.
- Return short concrete strings, not long sentences, for urgencySignals and tourLimitations.
- Do not treat normal showing windows, standard application documents, lease terms, or routine fee disclosures as scam signals by themselves.
- Do not include markdown fences or commentary.

Communication:
${messageText || "No message text provided."}
`.trim();
}

export function buildScreenshotExtractionPrompt(input: {
  files: { name: string; contentType: string; size: number }[];
}) {
  return `
Analyze the provided screenshot images directly for a Manhattan rental scam workflow and return JSON with:
- text
- confidence (0 to 1)
- notes (string[])

Rules:
- Summarize only text or scam-relevant signals that are actually visible in the screenshots.
- Keep text concise but useful for downstream risk scoring.
- Do not mention missing capabilities or metadata-only limitations.
- Do not include markdown fences or commentary.

Uploaded screenshots:
${input.files.map((file) => `- ${file.name} (${file.contentType}, ${file.size} bytes)`).join("\n") || "- none"}
`.trim();
}

export function buildRiskScoringPrompt(input: {
  normalizedAddress?: string;
  borough?: string;
  neighborhood?: string;
  rent?: number;
  contactRole?: string;
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
- rankedFactors (array of objects with: title, severity, contribution, explanation, evidenceSource)
- recommendedNextSteps (string[])
- notes (string[])

Rules:
- Keep rankedFactors aligned to the supplied candidate factors when possible.
- Keep rankedFactors to the most material 4 to 6 items.
- Use evidenceSource values only from: "url", "message", "screenshot", "tool".
- Do not introduce keys like "factor" or "evidence"; use the exact keys requested above.
- Keep recommendedNextSteps to 3 to 5 concise actions.
- Do not treat ordinary showing windows, standard application requirements, or routine lease terms as suspicious unless they are paired with payment pressure, identity inconsistencies, or refusal-to-show behavior.
- Refer to a broker only when contactRole is explicitly broker or broker/agent. Otherwise use broader contact or listing-contact language.
- If the only material concern is modest rent underpricing and the communication is otherwise routine, keep the result in low risk territory.
- Do not include markdown fences or commentary.

Use these facts:
- normalizedAddress: ${input.normalizedAddress ?? "Unavailable"}
- borough: ${input.borough ?? "Unavailable"}
- neighborhood: ${input.neighborhood ?? "Unavailable"}
- rent: ${input.rent ?? "Unavailable"}
- contactRole: ${input.contactRole ?? "Unavailable"}
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

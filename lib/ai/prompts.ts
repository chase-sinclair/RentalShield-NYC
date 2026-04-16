export const EXTRACTION_SYSTEM_PROMPT = `
You are extracting structured rental listing evidence for Manhattan scam analysis.
Prefer explicit facts over guesses. Return fields even when partial and identify uncertainty.
`.trim();

export const RISK_SCORING_SYSTEM_PROMPT = `
You are assigning an explainable rental scam risk estimate.
Ground each factor in evidence from tools or supplied text. Do not overclaim certainty.
`.trim();

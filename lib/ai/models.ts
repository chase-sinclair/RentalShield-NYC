import { serverEnv } from "@/lib/config/env";

export const DEFAULT_BEDROCK_MODEL_ID = serverEnv.bedrockModelId;

export const SUPPORTED_BEDROCK_MODELS = [
  {
    id: DEFAULT_BEDROCK_MODEL_ID,
    label: "Default MVP Model",
    description: "Primary Bedrock model used for extraction and scam reasoning.",
  },
  {
    id: serverEnv.bedrockFallbackModelId ?? "anthropic.claude-3-5-sonnet-20241022-v2:0",
    label: "Fallback Model",
    description: "Optional comparison model for evaluation and resilience.",
  },
];

export function getAvailableModels() {
  return SUPPORTED_BEDROCK_MODELS.filter(Boolean);
}

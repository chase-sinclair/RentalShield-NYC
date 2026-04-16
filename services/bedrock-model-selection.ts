import { getAvailableModels } from "@/lib/ai/models";
import { serverEnv } from "@/lib/config/env";

export function getActiveBedrockModel() {
  return {
    activeModelId: serverEnv.bedrockModelId,
    availableModels: getAvailableModels(),
  };
}

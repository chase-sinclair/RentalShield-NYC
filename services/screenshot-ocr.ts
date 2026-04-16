import { invokeBedrockJson } from "@/lib/ai/bedrock";
import {
  buildScreenshotExtractionPrompt,
  SCREENSHOT_EXTRACTION_SYSTEM_PROMPT,
} from "@/lib/ai/prompts";
import type { ScreenshotExtractionResult } from "@/lib/analysis/types";
import type { UploadAsset } from "@/types";

export async function extractScreenshotText(files: UploadAsset[]) {
  if (!files.length) {
    return {
      text: "",
      confidence: 0,
      fileCount: 0,
      notes: ["No screenshots were provided for extraction."],
      modelIdUsed: "none",
    };
  }

  try {
    const response = await invokeBedrockJson<Omit<ScreenshotExtractionResult, "fileCount" | "modelIdUsed">>({
      systemPrompt: SCREENSHOT_EXTRACTION_SYSTEM_PROMPT,
      userPrompt: buildScreenshotExtractionPrompt({ files }),
    });

    return {
      text: response.data.text ?? "",
      confidence: response.data.confidence ?? 0.42,
      fileCount: files.length,
      notes: response.data.notes ?? [],
      modelIdUsed: response.modelIdUsed,
    };
  } catch {
    return {
      text: "Mock screenshot text mentioning a quick deposit and remote owner.",
      confidence: 0.63,
      fileCount: files.length,
      notes: ["Used mock screenshot extraction fallback because Bedrock multimodal extraction is not active."],
      modelIdUsed: "mock-fallback",
    };
  }
}

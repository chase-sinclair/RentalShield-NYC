import { invokeBedrockMultimodalJson } from "@/lib/ai/bedrock";
import {
  buildScreenshotExtractionPrompt,
  SCREENSHOT_EXTRACTION_SYSTEM_PROMPT,
} from "@/lib/ai/prompts";
import type { ScreenshotExtractionResult } from "@/lib/analysis/types";
import type { StagedUploadAsset } from "@/types";

function toStringArray(value: unknown) {
  if (Array.isArray(value)) {
    return value
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  if (typeof value === "string" && value.trim()) {
    return [value.trim()];
  }

  return [];
}

function normalizeScreenshotResult(
  value: unknown,
  files: StagedUploadAsset[],
): Omit<ScreenshotExtractionResult, "fileCount" | "modelIdUsed"> {
  const payload = value as Record<string, unknown>;
  const textValue = payload.text ?? payload.visibleText ?? payload.ocrText ?? payload.summary;
  const text = Array.isArray(textValue)
    ? textValue.filter((item): item is string => typeof item === "string").join("\n")
    : typeof textValue === "string"
      ? textValue.trim()
      : "";
  const confidence =
    typeof payload.confidence === "number" && Number.isFinite(payload.confidence) ? payload.confidence : 0.68;
  const notes = toStringArray(payload.notes);

  return {
    text,
    confidence,
    notes:
      notes.length > 0
        ? notes
        : [`Processed ${files.length} screenshot file${files.length === 1 ? "" : "s"} with Bedrock multimodal analysis.`],
  };
}

export async function extractScreenshotText(files: StagedUploadAsset[]) {
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
    const response = await invokeBedrockMultimodalJson<unknown>({
      systemPrompt: SCREENSHOT_EXTRACTION_SYSTEM_PROMPT,
      userPrompt: buildScreenshotExtractionPrompt({ files }),
      images: files,
    });
    const normalized = normalizeScreenshotResult(response.data, files);

    return {
      ...normalized,
      fileCount: files.length,
      modelIdUsed: response.modelIdUsed,
    };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Unknown Bedrock multimodal error.";
    console.error("Screenshot Bedrock multimodal call failed:", error);
    return {
      text: "",
      confidence: 0.63,
      fileCount: files.length,
      notes: [
        "Used fallback screenshot extraction because Bedrock multimodal analysis was unavailable.",
        `Fallback reason: ${reason}`,
      ],
      modelIdUsed: "mock-fallback",
    };
  }
}

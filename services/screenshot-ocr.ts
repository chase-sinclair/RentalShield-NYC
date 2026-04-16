import type { UploadAsset } from "@/types";

export async function extractScreenshotText(files: UploadAsset[]) {
  // TODO: Connect screenshot OCR to Bedrock multimodal extraction.
  return {
    text: files.length ? "Mock screenshot text mentioning a quick deposit and remote owner." : "",
    confidence: files.length ? 0.63 : 0,
    fileCount: files.length,
  };
}

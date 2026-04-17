import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";

import { serverEnv } from "@/lib/config/env";
import type { StagedUploadAsset } from "@/types";

let client: BedrockRuntimeClient | null = null;
const BEDROCK_MAX_ATTEMPTS = 6;
const BEDROCK_RETRYABLE_ERRORS = new Set([
  "ThrottlingException",
  "TooManyRequestsException",
  "ServiceUnavailableException",
  "ModelTimeoutException",
]);

export function getBedrockClient() {
  if (!client) {
    client = new BedrockRuntimeClient({
      region: serverEnv.awsRegion,
    });
  }

  return client;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getRetryDelayMs(attempt: number) {
  const baseDelay = 1000 * 2 ** attempt;
  const jitter = Math.floor(Math.random() * 250);

  return Math.min(baseDelay, 5000) + jitter;
}

export async function invokeBedrockModel(input: {
  modelId?: string;
  body: Record<string, unknown>;
}) {
  const modelId = input.modelId ?? serverEnv.bedrockModelId;

  // TODO: Replace the placeholder payload shape with the chosen Bedrock model contract.
  const command = new InvokeModelCommand({
    modelId,
    contentType: "application/json",
    accept: "application/json",
    body: JSON.stringify(input.body),
  });

  let lastError: unknown;

  for (let attempt = 0; attempt < BEDROCK_MAX_ATTEMPTS; attempt += 1) {
    try {
      return await getBedrockClient().send(command);
    } catch (error) {
      lastError = error;
      const errorName = error instanceof Error ? error.name : "";
      const shouldRetry = BEDROCK_RETRYABLE_ERRORS.has(errorName);

      if (!shouldRetry || attempt === BEDROCK_MAX_ATTEMPTS - 1) {
        throw error;
      }

      const delayMs = getRetryDelayMs(attempt);
      await sleep(delayMs);
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Bedrock invocation failed.");
}

function decodeBody(body: Uint8Array | undefined) {
  if (!body) {
    return "";
  }

  return new TextDecoder().decode(body);
}

function extractJsonCandidate(text: string) {
  const trimmed = text.trim();

  if (!trimmed) {
    return "";
  }

  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");

  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1);
  }

  return trimmed;
}

function parseAnthropicTextResponse(raw: string) {
  const parsed = JSON.parse(raw) as {
    content?: { type: string; text?: string }[];
  };

  return parsed.content?.map((item) => item.text ?? "").join("\n") ?? raw;
}

export async function invokeBedrockJson<TOutput>(input: {
  systemPrompt: string;
  userPrompt: string;
  modelId?: string;
  maxTokens?: number;
}): Promise<{ data: TOutput; modelIdUsed: string }> {
  const modelIdUsed = input.modelId ?? serverEnv.bedrockModelId;

  const response = await invokeBedrockModel({
    modelId: modelIdUsed,
    body: {
      anthropic_version: "bedrock-2023-05-31",
      max_tokens: input.maxTokens ?? 1000,
      system: input.systemPrompt,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: input.userPrompt,
            },
          ],
        },
      ],
    },
  });

  const raw = decodeBody(response.body);
  const text = parseAnthropicTextResponse(raw);
  const jsonCandidate = extractJsonCandidate(text);

  return {
    data: JSON.parse(jsonCandidate) as TOutput,
    modelIdUsed,
  };
}

export async function invokeBedrockMultimodalJson<TOutput>(input: {
  systemPrompt: string;
  userPrompt: string;
  images: StagedUploadAsset[];
  modelId?: string;
  maxTokens?: number;
}): Promise<{ data: TOutput; modelIdUsed: string }> {
  const modelIdUsed = input.modelId ?? serverEnv.bedrockModelId;

  const imageContent = input.images.map((image) => ({
    type: "image",
    source: {
      type: "base64",
      media_type: image.contentType,
      data: image.base64Data,
    },
  }));

  const response = await invokeBedrockModel({
    modelId: modelIdUsed,
    body: {
      anthropic_version: "bedrock-2023-05-31",
      max_tokens: input.maxTokens ?? 1200,
      system: input.systemPrompt,
      messages: [
        {
          role: "user",
          content: [
            ...imageContent,
            {
              type: "text",
              text: input.userPrompt,
            },
          ],
        },
      ],
    },
  });

  const raw = decodeBody(response.body);
  const text = parseAnthropicTextResponse(raw);
  const jsonCandidate = extractJsonCandidate(text);

  return {
    data: JSON.parse(jsonCandidate) as TOutput,
    modelIdUsed,
  };
}

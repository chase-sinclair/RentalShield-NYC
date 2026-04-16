import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";

import { serverEnv } from "@/lib/config/env";

let client: BedrockRuntimeClient | null = null;

export function getBedrockClient() {
  if (!client) {
    client = new BedrockRuntimeClient({
      region: serverEnv.awsRegion,
    });
  }

  return client;
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

  return getBedrockClient().send(command);
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
  const parsed = JSON.parse(raw) as {
    content?: { type: string; text?: string }[];
  };
  const text = parsed.content?.map((item) => item.text ?? "").join("\n") ?? raw;
  const jsonCandidate = extractJsonCandidate(text);

  return {
    data: JSON.parse(jsonCandidate) as TOutput,
    modelIdUsed,
  };
}

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

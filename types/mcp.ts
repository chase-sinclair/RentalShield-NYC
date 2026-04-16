export interface McpToolRequest<TInput = unknown> {
  toolName: string;
  input: TInput;
}

export interface McpToolResponse<TOutput = unknown> {
  toolName: string;
  ok: boolean;
  output?: TOutput;
  error?: string;
  notes?: string[];
}

export interface McpExecutionTrace {
  toolName: string;
  status: "completed" | "skipped" | "failed";
  detail: string;
}

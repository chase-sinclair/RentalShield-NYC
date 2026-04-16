import type { McpExecutionTrace } from "@/types";

export function createTraceEntry(
  toolName: string,
  status: McpExecutionTrace["status"],
  detail: string,
): McpExecutionTrace {
  return {
    toolName,
    status,
    detail,
  };
}

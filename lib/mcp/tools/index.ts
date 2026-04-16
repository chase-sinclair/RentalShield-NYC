export const REQUIRED_MCP_TOOLS = [
  "listing_parser_tool",
  "message_extraction_tool",
  "ocr_or_multimodal_extraction_tool",
  "address_verification_tool",
  "nyc_property_context_tool",
  "broker_verification_tool",
  "rent_comparison_tool",
  "risk_scoring_tool",
] as const;

export type RequiredMcpTool = (typeof REQUIRED_MCP_TOOLS)[number];

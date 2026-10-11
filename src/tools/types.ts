export const MAX_TOOL_RESULT_CHARS = 8000;
export const MAX_TOOL_TURNS = 6;

export interface ToolContext {
  tabId: number;
  signal: AbortSignal;
}

export interface ToolSchema {
  type: "object";
  properties: Record<string, unknown>;
  required?: string[];
}

export interface ToolDef {
  name: string;
  description: string;
  inputSchema: ToolSchema;
  run(input: Record<string, unknown>, ctx: ToolContext): Promise<string>;
}

export interface ToolUse {
  id: string;
  name: string;
  input: Record<string, unknown>;
}

interface Message {
  role: string;
  content: unknown;
}

const TOOL_MARKER = /\[(tool|toolloop):(\w+) (\{[^\]]*\})\]/;

const hasToolResult = (messages: Message[]): boolean =>
  messages.some(
    (message) => Array.isArray(message.content) && message.content.some((block) => (block as { type?: string }).type === "tool_result"),
  );

function parseInput(json: string): Record<string, unknown> | undefined {
  try {
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return undefined;
  }
}

/** `[tool:NAME JSON]` answers a tool_use until a tool_result is in the history; `[toolloop:NAME JSON]` always does. */
export function plannedToolUse(body: unknown, lastUserText: string): ToolUse | undefined {
  const marker = TOOL_MARKER.exec(lastUserText);
  if (!marker) return undefined;
  const [, kind, name, json] = marker;
  const messages = (body as { messages?: Message[] } | null)?.messages ?? [];
  if (kind === "tool" && hasToolResult(messages)) return undefined;
  const input = parseInput(json ?? "");
  if (!input || !name) return undefined;
  return { id: `toolu_mock_${name}`, name, input };
}

export const toolUseBlock = (tool: ToolUse) => ({ type: "tool_use", id: tool.id, name: tool.name, input: tool.input });

export function toolUseEvents(tool: ToolUse, usage: { output_tokens: number }): [string, object][] {
  return [
    ["content_block_start", { index: 0, content_block: { ...toolUseBlock(tool), input: {} } }],
    ["content_block_delta", { index: 0, delta: { type: "input_json_delta", partial_json: JSON.stringify(tool.input) } }],
    ["content_block_stop", { index: 0 }],
    ["message_delta", { delta: { stop_reason: "tool_use", stop_sequence: null }, usage }],
    ["message_stop", {}],
  ];
}

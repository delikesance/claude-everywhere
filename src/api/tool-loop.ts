import type Anthropic from "@anthropic-ai/sdk";
import { allTools, MAX_TOOL_TURNS, runTool } from "../tools";

export type TurnRunner = (messages: Anthropic.MessageParam[], tools: Anthropic.Tool[] | undefined) => Promise<Anthropic.Message>;

export interface ToolCall {
  name: string;
  input: Record<string, unknown>;
  resultChars: number;
}

export interface ToolLoopOptions {
  messages: Anthropic.MessageParam[];
  tabId: number | undefined;
  signal: AbortSignal;
  runTurn: TurnRunner;
  onTool(call: ToolCall): void;
}

export interface ToolLoopResult {
  stopReason: Anthropic.StopReason | null;
  usage: { inputTokens: number; outputTokens: number };
  toolChars: number;
}

const toolParams = (): Anthropic.Tool[] =>
  allTools.map((tool) => ({ name: tool.name, description: tool.description, input_schema: { ...tool.inputSchema } }));

async function runCalls(
  content: Anthropic.ContentBlock[],
  tabId: number,
  options: ToolLoopOptions,
): Promise<{ results: Anthropic.ToolResultBlockParam[]; resultChars: number }> {
  const results: Anthropic.ToolResultBlockParam[] = [];
  let resultChars = 0;
  for (const block of content) {
    if (block.type !== "tool_use") continue;
    const input = block.input as Record<string, unknown>;
    const result = await runTool(block.name, input, { tabId, signal: options.signal });
    options.onTool({ name: block.name, input, resultChars: result.length });
    resultChars += result.length;
    results.push({ type: "tool_result", tool_use_id: block.id, content: result });
  }
  return { results, resultChars };
}

export async function runToolLoop(options: ToolLoopOptions): Promise<ToolLoopResult> {
  const { tabId, signal, runTurn } = options;
  const tools = tabId === undefined ? undefined : toolParams();
  const messages = [...options.messages];
  const usage = { inputTokens: 0, outputTokens: 0 };
  let toolChars = 0;
  for (let turn = 1; ; turn += 1) {
    signal.throwIfAborted();
    const message = await runTurn(messages, tools);
    usage.inputTokens += message.usage.input_tokens;
    usage.outputTokens += message.usage.output_tokens;
    if (message.stop_reason !== "tool_use" || tabId === undefined || turn >= MAX_TOOL_TURNS) {
      return { stopReason: message.stop_reason, usage, toolChars };
    }
    const calls = await runCalls(message.content, tabId, options);
    toolChars += calls.resultChars;
    messages.push({ role: "assistant", content: message.content }, { role: "user", content: calls.results });
  }
}

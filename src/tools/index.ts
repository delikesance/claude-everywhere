import { pageTools } from "./page";
import { MAX_TOOL_RESULT_CHARS, type ToolContext, type ToolDef } from "./types";
import { youtubeTools } from "./youtube";

export * from "./types";

export const allTools: readonly ToolDef[] = [...pageTools, ...youtubeTools];

const HIGH_SURROGATE = /[\uD800-\uDBFF]/;

function truncate(text: string): string {
  if (text.length <= MAX_TOOL_RESULT_CHARS) return text;
  const lastKept = text.charAt(MAX_TOOL_RESULT_CHARS - 1);
  const end = HIGH_SURROGATE.test(lastKept) ? MAX_TOOL_RESULT_CHARS - 1 : MAX_TOOL_RESULT_CHARS;
  return `${text.slice(0, end)}\n[truncated]`;
}

export async function runTool(name: string, input: Record<string, unknown>, ctx: ToolContext): Promise<string> {
  const tool = allTools.find((candidate) => candidate.name === name);
  if (!tool) return `Error: unknown tool ${name}`;
  try {
    return truncate(await tool.run(input, ctx));
  } catch (e) {
    return `Error: ${e instanceof Error ? e.message : "tool failed"}`;
  }
}

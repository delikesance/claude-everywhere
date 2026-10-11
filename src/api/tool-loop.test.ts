// @vitest-environment node
import type Anthropic from "@anthropic-ai/sdk";
import { describe, expect, it, vi } from "vitest";
import { MAX_TOOL_TURNS } from "../tools";
import { runToolLoop, type ToolCall, type TurnRunner } from "./tool-loop";

vi.mock("../tools/youtube", () => ({ youtubeTools: [] }));
vi.mock("../tools/page", () => ({
  pageTools: [
    {
      name: "echo",
      description: "Echo the input back",
      inputSchema: { type: "object", properties: {} },
      run: async (input: Record<string, unknown>) => `echo:${JSON.stringify(input)}`,
    },
    {
      name: "boom",
      description: "Always fails",
      inputSchema: { type: "object", properties: {} },
      run: async () => {
        throw new Error("boom");
      },
    },
  ],
}));

const usage = { input_tokens: 10, output_tokens: 3 };
const turnMessage = (stop_reason: string, content: unknown[]): Anthropic.Message =>
  ({ stop_reason, usage, content }) as unknown as Anthropic.Message;
const toolUse = (name: string, input: Record<string, unknown> = {}) => ({ type: "tool_use", id: `id-${name}`, name, input });
const textBlock = { type: "text", text: "partial" };

function fakeTurns(...turns: Anthropic.Message[]) {
  const queue = [...turns];
  return vi.fn<TurnRunner>(async () => {
    const next = queue.shift();
    if (!next) throw new Error("no more fake turns");
    return next;
  });
}

const baseOptions = (runTurn: ReturnType<typeof fakeTurns>, overrides = {}) => ({
  messages: [{ role: "user" as const, content: "hi" }],
  tabId: 7,
  signal: new AbortController().signal,
  runTurn,
  onTool: vi.fn<(call: ToolCall) => void>(),
  ...overrides,
});

describe("runToolLoop", () => {
  it("runs one tool round trip, feeds the result back and sums usage", async () => {
    const runTurn = fakeTurns(
      turnMessage("tool_use", [textBlock, toolUse("echo", { q: 1 })]),
      turnMessage("end_turn", [textBlock]),
    );
    const options = baseOptions(runTurn);
    const result = await runToolLoop(options);

    expect(result).toEqual({
      stopReason: "end_turn",
      usage: { inputTokens: 20, outputTokens: 6 },
      toolChars: 'echo:{"q":1}'.length,
    });
    expect(options.onTool).toHaveBeenCalledWith({ name: "echo", input: { q: 1 }, resultChars: 'echo:{"q":1}'.length });
    expect(runTurn.mock.calls[1]?.[0]).toEqual([
      { role: "user", content: "hi" },
      { role: "assistant", content: [textBlock, toolUse("echo", { q: 1 })] },
      { role: "user", content: [{ type: "tool_result", tool_use_id: "id-echo", content: 'echo:{"q":1}' }] },
    ]);
  });

  it("offers the registered tools only when a tab is attached", async () => {
    const withTab = fakeTurns(turnMessage("end_turn", []));
    await runToolLoop(baseOptions(withTab));
    expect(withTab.mock.calls[0]?.[1]).toEqual([
      expect.objectContaining({ name: "echo", input_schema: { type: "object", properties: {} } }),
      expect.objectContaining({ name: "boom" }),
    ]);

    const withoutTab = fakeTurns(turnMessage("end_turn", []));
    await runToolLoop(baseOptions(withoutTab, { tabId: undefined }));
    expect(withoutTab.mock.calls[0]?.[1]).toBeUndefined();
  });

  it("stops after MAX_TOOL_TURNS even when the model keeps asking for tools", async () => {
    const runTurn = vi.fn(async () => turnMessage("tool_use", [toolUse("echo")]));
    const result = await runToolLoop(baseOptions(runTurn));
    expect(runTurn).toHaveBeenCalledTimes(MAX_TOOL_TURNS);
    expect(result.stopReason).toBe("tool_use");
  });

  it("stops without running tools when the signal is aborted between turns", async () => {
    const controller = new AbortController();
    const runTurn = fakeTurns(turnMessage("tool_use", [toolUse("echo")]), turnMessage("end_turn", []));
    const options = baseOptions(runTurn, {
      signal: controller.signal,
      onTool: vi.fn(() => controller.abort()),
    });
    await expect(runToolLoop(options)).rejects.toMatchObject({ name: "AbortError" });
    expect(runTurn).toHaveBeenCalledTimes(1);
  });

  it("returns an error string to the model for an unknown tool", async () => {
    const runTurn = fakeTurns(
      turnMessage("tool_use", [toolUse("missing")]),
      turnMessage("end_turn", []),
    );
    const options = baseOptions(runTurn);
    await runToolLoop(options);
    expect(runTurn.mock.calls[1]?.[0].at(-1)).toEqual({
      role: "user",
      content: [{ type: "tool_result", tool_use_id: "id-missing", content: "Error: unknown tool missing" }],
    });
    expect(options.onTool).toHaveBeenCalledWith({ name: "missing", input: {}, resultChars: "Error: unknown tool missing".length });
  });

  it("does not run tools when a tool turn is cut by max_tokens", async () => {
    const runTurn = fakeTurns(turnMessage("max_tokens", [textBlock, toolUse("echo")]));
    const options = baseOptions(runTurn);
    const result = await runToolLoop(options);
    expect(result).toEqual({ stopReason: "max_tokens", usage: { inputTokens: 10, outputTokens: 3 }, toolChars: 0 });
    expect(options.onTool).not.toHaveBeenCalled();
    expect(runTurn).toHaveBeenCalledTimes(1);
  });

  it("feeds a failing tool's error back to the model and keeps looping", async () => {
    const runTurn = fakeTurns(turnMessage("tool_use", [toolUse("boom")]), turnMessage("end_turn", []));
    await runToolLoop(baseOptions(runTurn));
    expect(runTurn.mock.calls[1]?.[0].at(-1)).toEqual({
      role: "user",
      content: [{ type: "tool_result", tool_use_id: "id-boom", content: "Error: boom" }],
    });
  });

  it("runs every tool_use block of a turn in order", async () => {
    const runTurn = fakeTurns(
      turnMessage("tool_use", [toolUse("echo", { a: 1 }), toolUse("boom"), toolUse("echo", { b: 2 })]),
      turnMessage("end_turn", []),
    );
    const options = baseOptions(runTurn);
    const result = await runToolLoop(options);
    const first = 'echo:{"a":1}';
    const second = 'echo:{"b":2}';
    expect(runTurn.mock.calls[1]?.[0].at(-1)).toEqual({
      role: "user",
      content: [
        { type: "tool_result", tool_use_id: "id-echo", content: first },
        { type: "tool_result", tool_use_id: "id-boom", content: "Error: boom" },
        { type: "tool_result", tool_use_id: "id-echo", content: second },
      ],
    });
    expect(result.toolChars).toBe(first.length + "Error: boom".length + second.length);
    expect(options.onTool).toHaveBeenCalledTimes(3);
  });

  it("rejects before the first turn when the signal is already aborted", async () => {
    const controller = new AbortController();
    controller.abort();
    const runTurn = fakeTurns(turnMessage("end_turn", []));
    await expect(runToolLoop(baseOptions(runTurn, { signal: controller.signal }))).rejects.toMatchObject({ name: "AbortError" });
    expect(runTurn).not.toHaveBeenCalled();
  });
});

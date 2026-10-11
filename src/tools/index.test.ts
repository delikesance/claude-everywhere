import { describe, expect, it, vi } from "vitest";
import { MAX_TOOL_RESULT_CHARS, runTool } from "./index";

const { fixed } = vi.hoisted(() => ({ fixed: vi.fn<() => Promise<string>>() }));

vi.mock("./page", () => ({
  pageTools: [{ name: "fixed", description: "", inputSchema: { type: "object", properties: {} }, run: fixed }],
}));
vi.mock("./youtube", () => ({ youtubeTools: [] }));

const ctx = { tabId: 1, signal: new AbortController().signal };
const TRUNCATED = "\n[truncated]";

describe("runTool", () => {
  it("returns a result within the limit unchanged", async () => {
    const text = "x".repeat(MAX_TOOL_RESULT_CHARS);
    fixed.mockResolvedValueOnce(text);
    expect(await runTool("fixed", {}, ctx)).toBe(text);
  });

  it("truncates a longer result and marks it", async () => {
    fixed.mockResolvedValueOnce("x".repeat(MAX_TOOL_RESULT_CHARS + 5));
    expect(await runTool("fixed", {}, ctx)).toBe("x".repeat(MAX_TOOL_RESULT_CHARS) + TRUNCATED);
  });

  it("does not cut a surrogate pair at the truncation boundary", async () => {
    fixed.mockResolvedValueOnce("x".repeat(MAX_TOOL_RESULT_CHARS - 1) + "😀");
    expect(await runTool("fixed", {}, ctx)).toBe("x".repeat(MAX_TOOL_RESULT_CHARS - 1) + TRUNCATED);
  });

  it("reports a thrown error as a tool error string", async () => {
    fixed.mockRejectedValueOnce(new Error("nope"));
    expect(await runTool("fixed", {}, ctx)).toBe("Error: nope");
  });

  it("reports a non-Error throw with a generic message", async () => {
    fixed.mockRejectedValueOnce("nope");
    expect(await runTool("fixed", {}, ctx)).toBe("Error: tool failed");
  });

  it("reports an unknown tool name", async () => {
    expect(await runTool("missing", {}, ctx)).toBe("Error: unknown tool missing");
  });
});

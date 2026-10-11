import { describe, expect, it } from "vitest";
import { DEFAULT_MAX_TOKENS, MAX_OUTPUT_TOKENS, MODEL_IDS } from "../shared/constants";
import { parseChatStart } from "./chat-start";

const request = (overrides: Record<string, unknown> = {}) => ({
  model: MODEL_IDS[0],
  items: [],
  history: [],
  userText: "hi",
  answerLanguage: "auto",
  ...overrides,
});

describe("parseChatStart tabId", () => {
  it("accepts a request without tabId", () => {
    expect(parseChatStart(request())).not.toBeNull();
  });

  it("accepts a positive integer tabId", () => {
    expect(parseChatStart(request({ tabId: 7 }))?.tabId).toBe(7);
  });

  it.each([-1, 0, 1.5, "7", null])("rejects tabId %j", (tabId) => {
    expect(parseChatStart(request({ tabId }))).toBeNull();
  });
});

describe("parseChatStart maxTokens", () => {
  it("falls back to the default for a non-numeric value", () => {
    expect(parseChatStart(request({ maxTokens: "big" }))?.maxTokens).toBe(DEFAULT_MAX_TOKENS);
  });

  it("clamps to the model output limit", () => {
    expect(parseChatStart(request({ maxTokens: 1e9 }))?.maxTokens).toBe(MAX_OUTPUT_TOKENS);
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ChatServerMsg } from "../../shared/messages";
import { DEFAULT_SETTINGS } from "../../shared/settings";
import type { Bordereau } from "../../shared/types";

const fake = vi.hoisted(() => {
  let listener: (m: unknown) => void = () => {};
  return {
    start: vi.fn(),
    cancel: vi.fn(),
    close: vi.fn(),
    emit: (m: unknown) => listener(m),
    onMessage: (cb: (m: unknown) => void) => {
      listener = cb;
    },
  };
});
const library = vi.hoisted(() => ({ saveConversation: vi.fn(async () => {}) }));

vi.mock("../../shared/messaging", () => ({ connectChat: () => fake }));
vi.mock("../../library", () => ({ openLibrary: async () => library }));

const { conversation, draft, resetConversation } = await import("./conversation");
const { settings } = await import("./session");
const turn = await import("./turn");

const bordereau = { lines: [], sentChars: 3, totalChars: 3 } as unknown as Bordereau;
const sentId = () => (fake.start.mock.calls[0] as [{ requestId: string }])[0].requestId;
const reply = (msg: Record<string, unknown>) => fake.emit({ requestId: sentId(), ...msg } as ChatServerMsg);
const last = () => conversation.value.messages.at(-1)!;

beforeEach(() => {
  vi.clearAllMocks();
  settings.value = { ...DEFAULT_SETTINGS, apiKey: "sk-test" };
  resetConversation();
  turn.phase.value = "idle";
  turn.turnNotice.value = null;
  draft.value = "Bonjour";
  turn.send();
});

describe("turn state machine", () => {
  it("starts: waiting phase, two messages, draft cleared, request sent", () => {
    expect(turn.phase.value).toBe("waiting");
    expect(conversation.value.messages.map((m) => m.role)).toEqual(["user", "assistant"]);
    expect(draft.value).toBe("");
    expect(fake.start).toHaveBeenCalledWith(expect.objectContaining({ userText: "Bonjour" }));
  });

  it("streams deltas", () => {
    reply({ type: "delta", text: "Sa" });
    reply({ type: "delta", text: "lut" });
    expect(turn.phase.value).toBe("streaming");
    expect(last().text).toBe("Salut");
  });

  it("finishes on done and persists", async () => {
    reply({ type: "delta", text: "ok" });
    reply({ type: "done", stopReason: "end_turn", usage: { inputTokens: 1, outputTokens: 1 }, bordereau });
    expect(turn.phase.value).toBe("idle");
    expect(last().stopReason).toBe("end_turn");
    expect(conversation.value.messages[0]?.bordereau).toBe(bordereau);
    expect(fake.close).toHaveBeenCalled();
    await vi.waitFor(() => expect(library.saveConversation).toHaveBeenCalled());
  });

  it("shows the max_tokens notice", () => {
    reply({ type: "delta", text: "ok" });
    reply({ type: "done", stopReason: "max_tokens", usage: { inputTokens: 1, outputTokens: 1 }, bordereau });
    expect(turn.turnNotice.value).toEqual({ kind: "max_tokens" });
  });

  it("shows the refusal notice", () => {
    reply({ type: "done", stopReason: "refusal", usage: { inputTokens: 1, outputTokens: 0 }, bordereau });
    expect(turn.turnNotice.value).toEqual({ kind: "refusal" });
  });

  it("cancel asks the background to abort", () => {
    turn.cancelTurn();
    expect(fake.cancel).toHaveBeenCalledWith(sentId());
  });

  it("aborted after some text keeps the partial answer as interrupted", () => {
    reply({ type: "delta", text: "un deux trois" });
    reply({ type: "error", error: { kind: "aborted" } });
    expect(last().stopReason).toBe("interrupted");
    expect(turn.turnNotice.value).toEqual({ kind: "interrupted", words: 3 });
    expect(turn.phase.value).toBe("idle");
  });

  it("aborted with no text rolls back and restores the draft", () => {
    reply({ type: "error", error: { kind: "aborted" } });
    expect(conversation.value.messages).toEqual([]);
    expect(draft.value).toBe("Bonjour");
    expect(turn.turnNotice.value).toBeNull();
  });

  it.each([
    { kind: "auth" },
    { kind: "rate_limit", retryAfterSec: 12 },
    { kind: "network" },
    { kind: "overloaded" },
    { kind: "bad_request", message: "x" },
    { kind: "unknown", status: 500 },
  ] as const)("error $kind rolls back and exposes the notice", (error) => {
    reply({ type: "error", error });
    expect(turn.turnNotice.value).toEqual(error);
    expect(conversation.value.messages).toEqual([]);
    expect(draft.value).toBe("Bonjour");
    expect(turn.phase.value).toBe("idle");
  });

  it("ignores messages from another request", () => {
    fake.emit({ type: "delta", requestId: "other", text: "x" });
    expect(last().text).toBe("");
  });

  it("does not send without a key", () => {
    reply({ type: "error", error: { kind: "network" } });
    settings.value = { ...DEFAULT_SETTINGS, apiKey: null };
    turn.send();
    expect(fake.start).toHaveBeenCalledTimes(1);
  });

  it("regenerate replaces the last answer by a new turn on the same question", () => {
    reply({ type: "delta", text: "ok" });
    reply({ type: "done", stopReason: "end_turn", usage: { inputTokens: 1, outputTokens: 1 }, bordereau });
    turn.regenerate();
    expect(fake.start).toHaveBeenCalledTimes(2);
    const second = fake.start.mock.calls[1]?.[0] as { userText: string; history: unknown[] };
    expect(second.userText).toBe("Bonjour");
    expect(second.history).toHaveLength(0);
    expect(conversation.value.messages).toHaveLength(2);
  });

  it("continue sends a follow-up turn keeping history", () => {
    reply({ type: "delta", text: "ok" });
    reply({ type: "done", stopReason: "max_tokens", usage: { inputTokens: 1, outputTokens: 1 }, bordereau });
    turn.continueAnswer();
    expect(fake.start).toHaveBeenCalledTimes(2);
    expect(turn.turnNotice.value).toBeNull();
    const second = fake.start.mock.calls[1]?.[0] as { history: unknown[] };
    expect(second.history).toHaveLength(2);
  });
});

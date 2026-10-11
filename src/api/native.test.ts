import { beforeEach, describe, expect, it, vi } from "vitest";
import { NATIVE_HOST_NAME } from "../shared/constants";
import type { ChatServerMsg } from "../shared/messages";
import type { Bordereau, ChatMessage } from "../shared/types";
import { pingNative, streamNative, transcriptPrompt, type NativeTurn } from "./native";

const BORDEREAU = { lines: [], sentChars: 0, totalChars: 0, budgetChars: 0, truncated: false, estimatedTokens: 0 } as unknown as Bordereau;
const TURN: NativeTurn = {
  requestId: "r1",
  model: "claude-sonnet-5-5",
  system: "sys",
  prompt: "User: hi",
  maxTokens: 100,
  bordereau: BORDEREAU,
};
const NO_ABORT = new AbortController().signal;

function installHost() {
  const sent: unknown[] = [];
  const listeners = { message: (_msg: unknown) => {}, disconnect: () => {} };
  const port = {
    postMessage: (msg: unknown) => {
      sent.push(msg);
    },
    disconnect: vi.fn(),
    onMessage: { addListener: (cb: (msg: unknown) => void) => (listeners.message = cb) },
    onDisconnect: { addListener: (cb: () => void) => (listeners.disconnect = cb) },
  };
  const connectNative = vi.fn(() => port);
  Object.assign(globalThis, { browser: { runtime: { connectNative } } });
  return {
    sent,
    port,
    connectNative,
    emit: (msg: unknown) => listeners.message(msg),
    drop: () => listeners.disconnect(),
  };
}

describe("streamNative", () => {
  let host: ReturnType<typeof installHost>;
  beforeEach(() => {
    host = installHost();
  });

  it("starts the host, forwards deltas, then resolves done with usage", async () => {
    const messages: ChatServerMsg[] = [];
    const finished = streamNative(TURN, NO_ABORT, (m) => messages.push(m));
    host.emit({ type: "delta", requestId: "r1", text: "Salut" });
    host.emit({ type: "done", requestId: "r1", stopReason: "end_turn", inputTokens: 3, outputTokens: 2 });
    expect(await finished).toEqual({
      type: "done",
      requestId: "r1",
      stopReason: "end_turn",
      usage: { inputTokens: 3, outputTokens: 2 },
      bordereau: BORDEREAU,
    });
    expect(messages).toEqual([{ type: "delta", requestId: "r1", text: "Salut" }]);
    expect(host.connectNative).toHaveBeenCalledWith(NATIVE_HOST_NAME);
    expect(host.sent).toEqual([
      { type: "start", requestId: "r1", model: "claude-sonnet-5-5", system: "sys", prompt: "User: hi", maxTokens: 100 },
    ]);
    expect(host.port.disconnect).toHaveBeenCalled();
  });

  it.each([
    ["not_logged_in", { kind: "auth" }],
    ["failed", { kind: "unknown", status: null }],
  ] as const)("maps host error %s", async (code, error) => {
    const finished = streamNative(TURN, NO_ABORT, () => {});
    host.emit({ type: "error", requestId: "r1", code, message: "boom" });
    expect(await finished).toEqual({ type: "error", requestId: "r1", error });
  });

  it("cancels the host and reports aborted when the signal fires", async () => {
    const controller = new AbortController();
    const finished = streamNative(TURN, controller.signal, () => {});
    controller.abort();
    expect(await finished).toEqual({ type: "error", requestId: "r1", error: { kind: "aborted" } });
    expect(host.sent.at(-1)).toEqual({ type: "cancel", requestId: "r1" });
    expect(host.port.disconnect).toHaveBeenCalled();
  });

  it("reports a host disconnect as an unknown error", async () => {
    const finished = streamNative(TURN, NO_ABORT, () => {});
    host.drop();
    expect(await finished).toEqual({ type: "error", requestId: "r1", error: { kind: "unknown", status: null } });
  });
});

describe("pingNative", () => {
  it("resolves true when the host answers pong", async () => {
    const host = installHost();
    const available = pingNative();
    host.emit({ type: "pong", version: "1" });
    expect(await available).toBe(true);
    expect(host.sent).toEqual([{ type: "ping" }]);
  });

  it("resolves false when the host is missing", async () => {
    const host = installHost();
    const available = pingNative();
    host.drop();
    expect(await available).toBe(false);
  });
});

describe("transcriptPrompt", () => {
  it("labels past turns and ends with the current user turn, skipping empty messages", () => {
    const history: ChatMessage[] = [
      { id: "h1", role: "user", text: "Q1", createdAt: 1 },
      { id: "h2", role: "assistant", text: "", createdAt: 2 },
      { id: "h3", role: "assistant", text: "A1", createdAt: 3 },
    ];
    expect(transcriptPrompt(history, "Q2")).toBe("User: Q1\n\nAssistant: A1\n\nUser: Q2");
  });
});

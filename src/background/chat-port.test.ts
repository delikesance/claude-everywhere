import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ChatServerMsg } from "../shared/messages";
import { EXTENSION_ID, installBrowserFake } from "./browser-fake";

const mocks = vi.hoisted(() => ({ streamChat: vi.fn() }));
vi.mock("../api", () => ({ streamChat: mocks.streamChat }));

import { handleChatPort } from "./chat-port";

const SECRET = "sk-ant-secret";
const startMsg = { type: "start", requestId: "r1", model: "claude-sonnet-5-5", items: [], history: [], userText: "hi", answerLanguage: "auto" };
const doneMsg: ChatServerMsg = {
  type: "done",
  requestId: "r1",
  stopReason: "end_turn",
  usage: { inputTokens: 1, outputTokens: 1 },
  bordereau: { lines: [], sentChars: 0, totalChars: 0, budgetChars: 1, truncated: false, estimatedTokens: 0, model: "claude-sonnet-5-5" },
};

function fakePort(senderId: string = EXTENSION_ID) {
  let onMessage: (m: unknown) => void = () => undefined;
  let onDisconnect: () => void = () => undefined;
  return {
    sender: { id: senderId },
    postMessage: vi.fn(),
    disconnect: vi.fn(),
    onMessage: { addListener: (cb: typeof onMessage) => (onMessage = cb) },
    onDisconnect: { addListener: (cb: typeof onDisconnect) => (onDisconnect = cb) },
    receive: (m: unknown) => onMessage(m),
    close: () => onDisconnect(),
  };
}

const connect = (port: ReturnType<typeof fakePort>) => handleChatPort(port as never);

describe("chat port", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    installBrowserFake();
  });

  it("relays deltas then the terminal message, never the key", async () => {
    mocks.streamChat.mockImplementation(async (_req, _signal, on) => {
      on({ type: "delta", requestId: "r1", text: "a" });
      on(doneMsg);
    });
    const port = fakePort();
    connect(port);
    port.receive(startMsg);
    await vi.waitFor(() => expect(port.postMessage).toHaveBeenCalledTimes(2));
    expect(port.postMessage.mock.calls.map(([m]) => m.type)).toEqual(["delta", "done"]);
    expect(JSON.stringify(port.postMessage.mock.calls)).not.toContain(SECRET);
  });

  it("aborts the stream on cancel", async () => {
    let signal!: AbortSignal;
    mocks.streamChat.mockImplementation(async (_req, s: AbortSignal, on) => {
      signal = s;
      await new Promise((resolve) => s.addEventListener("abort", resolve));
      on({ type: "error", requestId: "r1", error: { kind: "aborted" } });
    });
    const port = fakePort();
    connect(port);
    port.receive(startMsg);
    port.receive({ type: "cancel", requestId: "other" });
    expect(signal.aborted).toBe(false);
    port.receive({ type: "cancel", requestId: "r1" });
    await vi.waitFor(() => expect(port.postMessage).toHaveBeenCalledWith({ type: "error", requestId: "r1", error: { kind: "aborted" } }));
    expect(signal.aborted).toBe(true);
  });

  it("aborts on disconnect and stops posting", async () => {
    let signal!: AbortSignal;
    mocks.streamChat.mockImplementation(async (_req, s: AbortSignal, on) => {
      signal = s;
      await new Promise((resolve) => s.addEventListener("abort", resolve));
      on({ type: "error", requestId: "r1", error: { kind: "aborted" } });
    });
    const port = fakePort();
    connect(port);
    port.receive(startMsg);
    port.close();
    await vi.waitFor(() => expect(signal.aborted).toBe(true));
    expect(port.postMessage).not.toHaveBeenCalled();
  });

  it("allows one stream per port", async () => {
    mocks.streamChat.mockReturnValue(new Promise(() => undefined));
    const port = fakePort();
    connect(port);
    port.receive(startMsg);
    port.receive({ ...startMsg, requestId: "r2" });
    expect(mocks.streamChat).toHaveBeenCalledTimes(1);
    expect(port.postMessage).toHaveBeenCalledWith(expect.objectContaining({ type: "error", requestId: "r2" }));
  });

  it("turns a thrown stream into an error message", async () => {
    mocks.streamChat.mockRejectedValue(new Error(SECRET));
    const port = fakePort();
    connect(port);
    port.receive(startMsg);
    await vi.waitFor(() => expect(port.postMessage).toHaveBeenCalledTimes(1));
    expect(port.postMessage).toHaveBeenCalledWith({ type: "error", requestId: "r1", error: { kind: "unknown", status: null } });
  });

  it("rejects a start with an unknown model or malformed items", () => {
    const port = fakePort();
    connect(port);
    port.receive({ ...startMsg, model: "claude-expensive-9" });
    port.receive({ ...startMsg, requestId: "r2", items: [{ text: 1 }] });
    port.receive({ ...startMsg, requestId: "r3", history: undefined });
    expect(mocks.streamChat).not.toHaveBeenCalled();
    expect(port.postMessage).toHaveBeenCalledTimes(3);
    expect(port.postMessage).toHaveBeenCalledWith(expect.objectContaining({ type: "error", requestId: "r1" }));
  });

  it.each([
    [10_000_000, 64_000],
    [-5, 1],
    [undefined, 4096],
  ])("clamps maxTokens %s to %s", (sent, expected) => {
    mocks.streamChat.mockReturnValue(new Promise(() => undefined));
    const port = fakePort();
    connect(port);
    port.receive({ ...startMsg, maxTokens: sent });
    expect(mocks.streamChat.mock.calls[0]?.[0]).toMatchObject({ maxTokens: expected });
  });

  it("refuses ports from other extensions", () => {
    const port = fakePort("other@ext");
    connect(port);
    expect(port.disconnect).toHaveBeenCalled();
    port.receive(startMsg);
    expect(mocks.streamChat).not.toHaveBeenCalled();
  });
});

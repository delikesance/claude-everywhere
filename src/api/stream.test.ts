// @vitest-environment node
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { startMockApi } from "../../tests/mock-api/server";
import type { MockApi } from "../../tests/mock-api/server";
import { STORAGE_KEYS } from "../shared/constants";
import { AppException } from "../shared/errors";
import type { ChatServerMsg, ChatStart } from "../shared/messages";
import { installStorageStub } from "../shared/testing/browser-stub";
import type { ContextItem } from "../shared/types";
import { planContext, renderPrompt } from "./budget";
import { ITEM_WRAPPER_CHARS } from "./prompt";
import { streamChat, validateKey } from "./index";

const API_KEY = "sk-ant-test-key-1234";
const MOCK_PORT = 8787;
const DELTAS = ["Bonjour", " depuis", " le", " serveur", " factice."];
const ITEM: ContextItem = {
  id: "p1",
  kind: "page",
  title: "Zebras",
  url: null,
  text: "Zebras migrate in spring.",
  included: true,
  status: "ready",
};

let mock: MockApi;
let store: Map<string, unknown>;

beforeAll(async () => {
  mock = await startMockApi(MOCK_PORT);
});
afterAll(() => mock.close());
beforeEach(async () => {
  mock.requests.length = 0;
  store = installStorageStub();
  store.set(STORAGE_KEYS.settings, { apiKey: API_KEY });
});

const request = (userText: string, overrides: Partial<ChatStart> = {}): ChatStart => ({
  type: "start",
  requestId: "r1",
  model: "claude-sonnet-5-5",
  items: [ITEM],
  history: [],
  userText,
  answerLanguage: "fr",
  ...overrides,
});

async function run(req: ChatStart, signal = new AbortController().signal): Promise<ChatServerMsg[]> {
  const messages: ChatServerMsg[] = [];
  await streamChat(req, signal, (m) => messages.push(m));
  return messages;
}

const terminal = (messages: ChatServerMsg[]) => messages.filter((m) => m.type !== "delta");

describe("streamChat", () => {
  it("emits deltas in order then done with usage and bordereau", async () => {
    const messages = await run(request("hello"));
    expect(messages.filter((m) => m.type === "delta").map((m) => (m.type === "delta" ? m.text : ""))).toEqual(DELTAS);
    expect(messages.at(-1)).toMatchObject({
      type: "done",
      requestId: "r1",
      stopReason: "end_turn",
      usage: { inputTokens: 12, outputTokens: 5 },
      bordereau: { sentChars: ITEM.text.length + ITEM.title.length + ITEM_WRAPPER_CHARS, truncated: false },
    });
    expect(terminal(messages)).toHaveLength(1);
  });

  it("sends exactly the rendered prompt, history and model without sampling parameters", async () => {
    const history = [
      { id: "h1", role: "user" as const, text: "earlier question", createdAt: 1 },
      { id: "h2", role: "assistant" as const, text: "earlier answer", createdAt: 2 },
    ];
    await run(request("hello", { history, maxTokens: 777 }));
    const [recorded] = mock.requests;
    const { system, user } = renderPrompt(
      planContext([ITEM], "hello", "claude-sonnet-5-5", { maxTokens: 777, historyChars: history.reduce((n, m) => n + m.text.length, 0) }),
      "hello",
      "fr",
    );
    expect(recorded?.body).toEqual({
      model: "claude-sonnet-5-5",
      max_tokens: 777,
      stream: true,
      system,
      messages: [
        { role: "user", content: "earlier question" },
        { role: "assistant", content: "earlier answer" },
        { role: "user", content: user },
      ],
    });
    expect(recorded?.headers["x-api-key"]).toBe(API_KEY);
    expect(recorded?.headers["anthropic-version"]).toBeTruthy();
  });

  it.each([
    ["refusal", "refusal"],
    ["max_tokens", "max_tokens"],
  ] as const)("returns stop reason %s in done", async (scenario, stopReason) => {
    const messages = await run(request(`[scenario:${scenario}] hi`));
    expect(messages.at(-1)).toMatchObject({ type: "done", stopReason });
  });

  it("maps HTTP failures to a single error message", async () => {
    expect(terminal(await run(request("[scenario:rate_limit] hi")))).toEqual([
      { type: "error", requestId: "r1", error: { kind: "rate_limit", retryAfterSec: 7 } },
    ]);
    expect(terminal(await run(request("[scenario:overloaded] hi")))).toEqual([
      { type: "error", requestId: "r1", error: { kind: "overloaded" } },
    ]);
  });

  it("reports a missing key without calling the API", async () => {
    store.set(STORAGE_KEYS.settings, {});
    expect(await run(request("hi"))).toEqual([{ type: "error", requestId: "r1", error: { kind: "no_key" } }]);
    expect(mock.requests).toHaveLength(0);
  });

  it("emits aborted when cancelled mid-stream", async () => {
    const controller = new AbortController();
    const messages: ChatServerMsg[] = [];
    await streamChat(request("[scenario:slow] hi"), controller.signal, (m) => {
      messages.push(m);
      if (m.type === "delta") controller.abort();
    });
    expect(messages.filter((m) => m.type === "delta")).toHaveLength(1);
    expect(terminal(messages)).toEqual([{ type: "error", requestId: "r1", error: { kind: "aborted" } }]);
  });

  it("emits network when the connection drops mid-stream", async () => {
    const messages = await run(request("[scenario:drop] hi"));
    expect(terminal(messages)).toEqual([{ type: "error", requestId: "r1", error: { kind: "network" } }]);
  });

  it("never leaks the key in emitted messages", async () => {
    store.set(STORAGE_KEYS.settings, { apiKey: "sk-ant-invalid" });
    const all = [
      ...(await run(request("hi"))),
      ...(await run(request("[scenario:drop] hi"))),
      ...(await run(request("[scenario:rate_limit] hi"))),
    ];
    store.set(STORAGE_KEYS.settings, { apiKey: API_KEY });
    all.push(...(await run(request("hi"))), ...(await run(request("[scenario:drop] hi"))));
    const serialized = JSON.stringify(all);
    expect(serialized).not.toContain(API_KEY);
    expect(serialized).not.toContain("sk-ant-invalid");
  });

  it("maps the invalid key to auth", async () => {
    store.set(STORAGE_KEYS.settings, { apiKey: "sk-ant-invalid" });
    expect(terminal(await run(request("hi")))).toEqual([{ type: "error", requestId: "r1", error: { kind: "auth" } }]);
  });
});

describe("validateKey", () => {
  it("resolves for a valid key with a 1-token request", async () => {
    await expect(validateKey(API_KEY)).resolves.toBeUndefined();
    expect(mock.requests[0]?.body).toMatchObject({ model: "claude-haiku-5-5", max_tokens: 1 });
  });

  it("rejects with an auth AppException for an invalid key", async () => {
    const failure = await validateKey("sk-ant-invalid").catch((e: unknown) => e);
    expect(failure).toBeInstanceOf(AppException);
    expect((failure as AppException).error).toEqual({ kind: "auth" });
  });
});

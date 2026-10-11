import { render } from "preact";
import { act } from "preact/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_SETTINGS } from "../shared/settings";
import type { ChatMessage, ContextItem } from "../shared/types";

const fake = vi.hoisted(() => ({ start: vi.fn(), cancel: vi.fn(), close: vi.fn(), onMessage: vi.fn() }));
const planContext = vi.hoisted(() => vi.fn());

vi.mock("../shared/messaging", () => ({ connectChat: () => fake, sendRequest: vi.fn() }));
vi.mock("../library", () => ({ openLibrary: async () => ({ saveConversation: async () => {} }) }));
vi.mock("../api/budget", () => ({
  planContext,
  renderPrompt: () => ({ system: "SYS", user: "USR" }),
  MODEL_META: {
    "claude-haiku-5-5": { labelKey: "shared_modelHaiku" },
    "claude-sonnet-5-5": { labelKey: "shared_modelSonnet" },
    "claude-opus-5-5": { labelKey: "shared_modelOpus" },
  },
}));

const { App } = await import("./App");
const { AssistantTurn } = await import("./components/AssistantTurn");
const { conversation, addItem, resetConversation, draft } = await import("./state/conversation");
const { settings } = await import("./state/session");

const item = (id: string, included: boolean): ContextItem => ({
  id,
  kind: "page",
  title: `Page ${id}`,
  url: null,
  text: "texte",
  included,
  status: "ready",
});

const plannedFrom = (items: ContextItem[]) => {
  const sent = items.filter((i) => i.included);
  const lines = sent.map((i) => ({ itemId: i.id, title: i.title, sentChars: 5, totalChars: 5 }));
  return { bordereau: { lines, sentChars: 5 * sent.length, totalChars: 5 * sent.length, truncated: false, estimatedTokens: 12 }, blocks: [] };
};

let root: HTMLElement;
const mount = () => act(() => render(<App />, root));

beforeEach(() => {
  vi.clearAllMocks();
  planContext.mockImplementation(plannedFrom);
  Object.assign(globalThis, { browser: { runtime: { openOptionsPage: vi.fn() } } });
  settings.value = { ...DEFAULT_SETTINGS, apiKey: "sk-test" };
  resetConversation();
  root = document.createElement("div");
  document.body.replaceChildren(root);
});

describe("App", () => {
  it("shows the empty margin", () => {
    mount();
    expect(root.textContent).toContain("sidebar_emptyTitle");
  });

  it("shows the missing-key state and disables the composer", () => {
    settings.value = { ...DEFAULT_SETTINGS, apiKey: null };
    mount();
    expect(root.textContent).toContain("sidebar_noKeyTitle");
    expect(root.querySelector("textarea")?.disabled).toBe(true);
  });

  it("lists in the slip exactly the lines of planContext", () => {
    addItem(item("a", true));
    addItem(item("b", true));
    mount();
    const lines = [...root.querySelectorAll(".slip__line")].map((l) => l.textContent);
    expect(lines).toHaveLength(2);
    expect(lines.join("")).toContain("Page a");
    expect(planContext).toHaveBeenLastCalledWith(conversation.value.items, "", conversation.value.model);
  });

  it("excluding a chip removes it from the slip and from the request", () => {
    addItem(item("a", true));
    addItem(item("b", true));
    mount();
    act(() => root.querySelector<HTMLButtonElement>(".chip__main")?.click());
    expect(root.querySelectorAll(".slip__line")).toHaveLength(1);
    act(() => {
      draft.value = "Question";
    });
    act(() => root.querySelector<HTMLButtonElement>(".btn--primary")?.click());
    const sent = fake.start.mock.calls[0]?.[0] as { items: ContextItem[] };
    expect(sent.items.map((i) => i.included)).toEqual([false, true]);
  });

  it("shows the exact rendered prompt in the preview", () => {
    addItem(item("a", true));
    mount();
    act(() => root.querySelector<HTMLButtonElement>(".slip__toggle")?.click());
    const previewToggle = [...root.querySelectorAll<HTMLButtonElement>("button")].find((b) =>
      b.textContent?.includes("sidebar_previewShow"),
    );
    act(() => previewToggle?.click());
    expect(root.querySelector(".preview")?.textContent).toContain("SYS");
    expect(root.querySelector(".preview")?.textContent).toContain("USR");
  });

  it("renders a hostile answer without script or handler nodes", () => {
    const message: ChatMessage = {
      id: "m",
      role: "assistant",
      text: '<script>alert(1)</script><img src=x onerror="alert(1)"> [l](javascript:alert(1))',
      createdAt: 0,
      stopReason: "end_turn",
    };
    act(() => render(<AssistantTurn message={message} number={1} phase={null} />, root));
    expect(root.querySelector("script")).toBeNull();
    const attributes = [...root.querySelectorAll("*")].flatMap((el) => [...el.attributes].map((a) => a.name));
    expect(attributes.some((name) => name.startsWith("on"))).toBe(false);
    expect(root.querySelector('a[href^="javascript"]')).toBeNull();
  });
});

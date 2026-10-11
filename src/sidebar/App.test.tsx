import { render } from "preact";
import { act } from "preact/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { formatChars } from "../shared/format";
import { initI18n } from "../shared/i18n";
import { DEFAULT_SETTINGS } from "../shared/settings";
import type { ChatMessage, ContextItem } from "../shared/types";

const fake = vi.hoisted(() => ({ start: vi.fn(), cancel: vi.fn(), close: vi.fn(), onMessage: vi.fn(), onDisconnect: vi.fn() }));
const library = vi.hoisted(() => ({
  saveConversation: async () => {},
  listArtifacts: vi.fn(),
  getArtifact: vi.fn(),
  listConversations: vi.fn(),
  deleteConversation: vi.fn(),
}));

vi.mock("../shared/messaging", () => ({ connectChat: () => fake, sendRequest: vi.fn() }));
vi.mock("../library", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../library")>()),
  openLibrary: async () => library,
}));

const { planContext, renderPrompt } = await import("../api/budget");
const { App } = await import("./App");
const { conversations, view } = await import("./state/history");
const { AssistantTurn } = await import("./components/AssistantTurn");
const { conversation, addItem, resetConversation, draft } = await import("./state/conversation");
const { settings } = await import("./state/session");
const { phase } = await import("./state/turn");

const item = (id: string, included: boolean): ContextItem => ({
  id,
  kind: "page",
  title: `Page ${id}`,
  url: null,
  text: "texte",
  included,
  status: "ready",
});

const HUGE_TEXT_CHARS = 600_000;

let root: HTMLElement;
const mount = () => act(() => render(<App />, root));
const click = (selector: string) => act(() => root.querySelector<HTMLElement>(selector)?.click());
const buttonByText = (text: string) =>
  [...document.querySelectorAll<HTMLButtonElement>("button")].find((b) => b.textContent?.includes(text));

beforeEach(() => {
  vi.clearAllMocks();
  Object.assign(globalThis, { browser: { runtime: { openOptionsPage: vi.fn() } } });
  settings.value = { ...DEFAULT_SETTINGS, apiKey: "sk-test" };
  resetConversation();
  phase.value = "idle";
  root = document.createElement("div");
  document.body.replaceChildren(root);
});

describe("App", () => {
  it("shows the empty margin with suggestions that send on click", () => {
    mount();
    expect(root.textContent).toContain("sidebar_askPage");
    click(".suggestion");
    expect(fake.start).toHaveBeenCalledWith(expect.objectContaining({ userText: "sidebar_suggestSummary" }));
  });

  it("disables send and shows the reading chip while the page is loading", () => {
    addItem({ ...item("loading", true), status: "loading" });
    mount();
    expect(root.querySelector(".chip--reading")?.textContent).toContain("sidebar_reading");
    expect(root.querySelector<HTMLTextAreaElement>("textarea")?.disabled).toBe(false);
    expect(root.querySelector(".btn--primary")?.getAttribute("aria-disabled")).toBe("true");
  });

  it("shows the protected-page notice without a chip", () => {
    addItem({ ...item("protected", false), status: "unreadable" });
    mount();
    expect(root.textContent).toContain("sidebar_protectedBody");
    expect(root.querySelector(".chip--unreadable")).toBeNull();
  });

  it("keeps the turn running when Escape was handled by a dialog or editor", () => {
    mount();
    act(() => {
      draft.value = "Question";
    });
    act(() => root.querySelector<HTMLButtonElement>(".btn--primary")?.click());
    const handled = new KeyboardEvent("keydown", { key: "Escape", cancelable: true });
    handled.preventDefault();
    window.dispatchEvent(handled);
    const dialog = document.body.appendChild(document.createElement("div"));
    dialog.setAttribute("role", "dialog");
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(fake.cancel).not.toHaveBeenCalled();
    dialog.remove();
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(fake.cancel).toHaveBeenCalled();
  });

  it("shows the missing-key state and disables the composer", () => {
    settings.value = { ...DEFAULT_SETTINGS, apiKey: null };
    mount();
    expect(root.textContent).toContain("sidebar_key_title");
    expect(root.querySelector("textarea")?.disabled).toBe(true);
  });

  it("lists in the slip exactly the lines of planContext", () => {
    addItem(item("a", true));
    addItem(item("b", true));
    mount();
    const lines = [...root.querySelectorAll(".slip__line")].map((l) => l.textContent);
    expect(lines).toHaveLength(2);
    expect(lines.join("")).toContain("Page a");
  });

  it("shows on each chip what is sent out of the total, from the same plan as the request", async () => {
    await initI18n("fr", { sidebar_chipSent: "{sent}|{total}" });
    addItem({ ...item("a", true), text: "x".repeat(HUGE_TEXT_CHARS) });
    mount();
    const { bordereau } = planContext(conversation.value.items, "", conversation.value.model, {
      maxTokens: settings.value.maxTokens,
      historyChars: 0,
    });
    const [line] = bordereau.lines;
    const caption = root.querySelector(".sb-chips .caption")?.textContent ?? "";
    expect(bordereau.truncated).toBe(true);
    expect(line?.sentChars).toBeLessThan(HUGE_TEXT_CHARS);
    expect(caption).toBe(`${formatChars(line!.sentChars)}|${formatChars(HUGE_TEXT_CHARS)}`);
    await initI18n("fr", {});
  });

  it("warns when the context is truncated and stays silent otherwise", () => {
    addItem(item("a", true));
    mount();
    expect(root.querySelector(".notice--warning")).toBeNull();
    act(() => addItem({ ...item("b", true), text: "x".repeat(HUGE_TEXT_CHARS) }));
    expect(root.querySelector(".notice--warning")?.textContent).toContain("sidebar_longDocBody");
  });

  it("counts the history in the budget so the preview equals what is sent", () => {
    addItem({ ...item("a", true), text: "x".repeat(HUGE_TEXT_CHARS) });
    const history = { id: "h", role: "user" as const, text: "y".repeat(1000), createdAt: 0 };
    conversation.value = { ...conversation.value, messages: [history] };
    mount();
    const reserve = { maxTokens: settings.value.maxTokens, historyChars: 1000 };
    const expected = planContext(conversation.value.items, "Question", conversation.value.model, reserve).bordereau;
    act(() => {
      draft.value = "Question";
    });
    act(() => root.querySelector<HTMLButtonElement>(".btn--primary")?.click());
    const sentUser = conversation.value.messages.find((m) => m.role === "user" && m.text === "Question");
    expect(sentUser?.bordereau).toEqual(expected);
    expect(fake.start).toHaveBeenCalledWith(expect.objectContaining({ maxTokens: settings.value.maxTokens }));
  });

  it("adds a library artifact as a chip", async () => {
    library.listArtifacts.mockResolvedValue([{ id: "a1", title: "Note" }]);
    library.getArtifact.mockResolvedValue({ id: "a1", title: "Note", url: null, markdown: "md" });
    await mount();
    click('button[aria-haspopup="menu"]');
    act(() => buttonByText("sidebar_addLibrary")?.click());
    await vi.waitFor(() => expect(buttonByText("Note")).toBeDefined());
    await act(async () => buttonByText("Note")?.click());
    await vi.waitFor(() => expect(conversation.value.items[0]).toMatchObject({ artifactId: "a1", title: "Note" }));
  });

  it("closes the add menu on Escape and returns focus to its trigger", () => {
    mount();
    click('button[aria-haspopup="menu"]');
    act(() => {
      root.querySelector<HTMLElement>('[role="menuitem"]')?.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    });
    expect(root.querySelector('[role="menu"]')).toBeNull();
    expect(document.activeElement).toBe(root.querySelector('button[aria-haspopup="menu"]'));
  });

  it("opens the history from the header icon button", async () => {
    library.listConversations.mockResolvedValue([]);
    mount();
    await act(async () => root.querySelector<HTMLButtonElement>('button[aria-label="sidebar_history"]')?.click());
    expect(view.value).toBe("history");
    view.value = "chat";
  });

  it("titles the header with the conversation title or the new-conversation label", () => {
    mount();
    expect(root.querySelector(".sb-title__text")?.textContent).toBe("sidebar_newConversation");
    act(() => {
      conversation.value = { ...conversation.value, title: "Résumé du marché" };
    });
    expect(root.querySelector(".sb-title__text")?.textContent).toBe("Résumé du marché");
  });

  it("asks for confirmation before deleting a conversation", async () => {
    conversations.value = [{ id: "c1", title: "Old", createdAt: 0, updatedAt: 0, model: "claude-sonnet-5-5" }];
    view.value = "history";
    library.deleteConversation.mockResolvedValue(undefined);
    mount();
    click('button[aria-label="sidebar_deleteConversation"]');
    expect(library.deleteConversation).not.toHaveBeenCalled();
    expect(document.querySelector('[role="dialog"]')).not.toBeNull();
    act(() => buttonByText("sidebar_cancel")?.click());
    expect(library.deleteConversation).not.toHaveBeenCalled();
    click('button[aria-label="sidebar_deleteConversation"]');
    await act(async () => buttonByText("sidebar_delete")?.click());
    expect(library.deleteConversation).toHaveBeenCalledWith("c1");
    expect(conversations.value).toEqual([]);
    view.value = "chat";
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
    const prompt = renderPrompt(
      planContext(conversation.value.items, "", conversation.value.model),
      "",
      settings.value.answerLanguage,
    );
    expect(root.querySelector(".preview")?.textContent).toContain(prompt.user);
  });

  it("offers to read a newly activated tab and captures it on Read", async () => {
    const { sendRequest } = await import("../shared/messaging");
    const { changedTab } = await import("./state/tabWatch");
    changedTab.value = { title: "Le Monde", url: "https://lemonde.fr" };
    mount();
    expect(root.textContent).toContain("sidebar_tabChangedTitle");
    act(() => buttonByText("sidebar_readPage")?.click());
    expect(changedTab.value).toBeNull();
    expect(sendRequest).toHaveBeenCalledWith("capture/run", { mode: "page", handoff: false });
  });

  it("shows the tab notice over the conversation, never in the footer", async () => {
    const { changedTab } = await import("./state/tabWatch");
    changedTab.value = { title: "Le Monde", url: "https://lemonde.fr" };
    mount();
    expect(root.querySelector(".sb-body > .tab-notice")?.getAttribute("role")).toBe("status");
    expect(root.querySelector(".sb-foot .tab-notice")).toBeNull();
    changedTab.value = null;
  });

  it("uses the generic wording when the tab title is unknown", async () => {
    const { changedTab } = await import("./state/tabWatch");
    changedTab.value = { title: "", url: "" };
    mount();
    expect(root.textContent).toContain("sidebar_tabChangedGeneric");
    act(() => buttonByText("sidebar_keepPreviousPage")?.click());
    expect(changedTab.value).toBeNull();
  });

  it("sends a follow-up picked under the last finished answer", () => {
    conversation.value = {
      ...conversation.value,
      messages: [
        { id: "u", role: "user", text: "Question", createdAt: 0 },
        { id: "m", role: "assistant", text: "Réponse", createdAt: 0, stopReason: "end_turn" },
      ],
    };
    mount();
    click(".followup");
    expect(fake.start).toHaveBeenCalledWith(expect.objectContaining({ userText: "sidebar_followUpDetail" }));
  });

  it("shows the dots while waiting and the caret while streaming", () => {
    const message: ChatMessage = { id: "m", role: "assistant", text: "", createdAt: 0 };
    act(() => render(<AssistantTurn message={message} number={1} phase="waiting" />, root));
    expect(root.querySelector(".anim-dots")).not.toBeNull();
    act(() => render(<AssistantTurn message={{ ...message, text: "Bon" }} number={1} phase="streaming" />, root));
    expect(root.querySelector(".anim-caret")).not.toBeNull();
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

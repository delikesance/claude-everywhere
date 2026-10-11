// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { planContext } from "../api/budget";
import { connectChat, sendRequest } from "../shared/messaging";
import type { ChatConnection, ChatServerMsg } from "../shared/messages";
import type { Bordereau } from "../shared/types";
import { HOST_TAG } from "./surface";
import { mountOverlay } from "./mount";
import { readSelection } from "./selection";

vi.mock("../shared/messaging", () => ({ sendRequest: vi.fn(), connectChat: vi.fn() }));
vi.mock("../api/budget", () => ({ planContext: vi.fn() }));

const GUARD = Symbol.for("claude-everywhere.overlay");
const SELECTED = "Le passage sélectionné";
const HOSTILE = `<script>alert(1)</script>\n\n<img src=x onerror=alert(1)> **bold**`;

const bordereau = (overrides: Partial<Bordereau> = {}): Bordereau => ({
  lines: [],
  sentChars: SELECTED.length,
  totalChars: SELECTED.length,
  budgetChars: 600_000,
  truncated: false,
  estimatedTokens: 6,
  model: "claude-sonnet-5-5",
  ...overrides,
});

let roots: ShadowRoot[];
let messageListener: (message: unknown) => void;
let deliver: (message: ChatServerMsg) => void;
const connection = { start: vi.fn(), cancel: vi.fn(), close: vi.fn(), onMessage: vi.fn() } satisfies ChatConnection;

const card = () => roots.at(-1)!;
const text = (selector: string) => card().querySelector(selector)?.textContent ?? "";
const settle = () => new Promise((resolve) => setTimeout(resolve));

function button(label: string): HTMLButtonElement {
  return [...card().querySelectorAll("button")].find((b) => b.textContent?.includes(label))!;
}

function select(selected: string, anchor: Node = document.body): void {
  vi.spyOn(window, "getSelection").mockReturnValue({
    rangeCount: 1,
    anchorNode: anchor,
    toString: () => selected,
    getRangeAt: () => ({ getBoundingClientRect: () => new DOMRect(20, 20, 80, 16) }),
  } as unknown as Selection);
}

async function mount(config: { hasKey: boolean } = { hasKey: true }): Promise<void> {
  vi.mocked(sendRequest).mockImplementation((async (type: string) =>
    type === "overlay/config"
      ? { defaultModel: "claude-sonnet-5-5", uiLocale: "fr", answerLanguage: "auto", ...config }
      : {}) as typeof sendRequest);
  await mountOverlay();
}

async function openCard(): Promise<void> {
  messageListener({ type: "overlay/show" });
  await settle();
}

beforeEach(() => {
  roots = [];
  const attachShadow = Element.prototype.attachShadow;
  vi.spyOn(Element.prototype, "attachShadow").mockImplementation(function (this: Element, init) {
    const root = attachShadow.call(this, init);
    roots.push(root);
    return root;
  });
  Object.assign(HTMLElement.prototype, { showPopover: vi.fn(), hidePopover: vi.fn() });
  Object.assign(globalThis, {
    browser: { runtime: { onMessage: { addListener: (fn: typeof messageListener) => (messageListener = fn) } } },
  });
  connection.onMessage.mockImplementation((cb: typeof deliver) => (deliver = cb));
  vi.mocked(connectChat).mockReturnValue(connection);
  vi.mocked(planContext).mockReturnValue({ bordereau: bordereau(), blocks: [] });
  select(SELECTED);
});

afterEach(() => {
  document.querySelectorAll(HOST_TAG).forEach((host) => host.remove());
  Reflect.deleteProperty(window, GUARD);
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

describe("mounting", () => {
  it("mounts once even when the script runs twice", async () => {
    await mount();
    await mount();
    expect(document.querySelectorAll(HOST_TAG)).toHaveLength(1);
    expect(document.querySelector(HOST_TAG)?.shadowRoot).toBeNull();
  });
});

const trusted = <E extends Event>(event: E): E => {
  Object.defineProperty(event, "isTrusted", { value: true });
  return event;
};

describe("selection rules", () => {
  it("ignores selections shorter than three characters", () => {
    select("ab");
    expect(readSelection()).toBeNull();
    select("  abc ");
    expect(readSelection()?.text).toBe("abc");
  });

  it("ignores selections inside editable fields", () => {
    const field = document.body.appendChild(document.createElement("textarea"));
    select(SELECTED, field);
    expect(readSelection()).toBeNull();
    field.remove();
  });

  it("ignores a focused password field", () => {
    const field = document.body.appendChild(document.createElement("input"));
    field.type = "password";
    field.focus();
    expect(readSelection()).toBeNull();
    field.remove();
  });

  it("ignores contenteditable regions", () => {
    const region = document.body.appendChild(document.createElement("div"));
    region.setAttribute("contenteditable", "true");
    select(SELECTED, region.appendChild(document.createTextNode(SELECTED)));
    expect(readSelection()).toBeNull();
    region.remove();
  });

  it("shows the toolbar after a valid selection", async () => {
    await mount();
    document.dispatchEvent(trusted(new Event("mouseup")));
    await settle();
    expect(card().querySelector("[role=toolbar]")).not.toBeNull();
  });
});

describe("card", () => {
  it("shows the quote and the bordereau of the selection", async () => {
    vi.mocked(planContext).mockReturnValue({ bordereau: bordereau({ truncated: true, sentChars: 10, totalChars: 22 }), blocks: [] });
    await mount();
    await openCard();
    expect(text(".overlay-card__quote")).toBe(SELECTED);
    expect(text(".status-tag")).toMatch(/Envoyé : 10\s+car\./);
    expect(text(".notice--warning")).toContain("10 envoyés sur 22");
    const [items, , model] = vi.mocked(planContext).mock.calls[0]!;
    expect(items).toEqual([expect.objectContaining({ kind: "selection", text: SELECTED, included: true })]);
    expect(model).toBe("claude-sonnet-5-5");
    expect(card().querySelector("[role=dialog]")?.getAttribute("aria-label")).toBe("Réponse");
  });

  it("streams a sanitised answer", async () => {
    await mount();
    await openCard();
    button("Expliquer").click();
    expect(connection.start).toHaveBeenCalledWith(
      expect.objectContaining({ model: "claude-sonnet-5-5", history: [], items: [expect.objectContaining({ text: SELECTED })] }),
    );
    const requestId = connection.start.mock.calls[0]![0].requestId as string;
    deliver({ type: "delta", requestId, text: HOSTILE });
    const answer = card().querySelector(".reading")!;
    expect(answer.querySelector("script, img")).toBeNull();
    expect(answer.querySelector("[onerror]")).toBeNull();
    expect(answer.querySelector("strong")?.textContent).toBe("bold");
    expect(answer.querySelector(".caret")).not.toBeNull();
  });

  it("saves the answer as a selection artifact", async () => {
    await mount();
    await openCard();
    button("Expliquer").click();
    const requestId = connection.start.mock.calls[0]![0].requestId as string;
    deliver({ type: "delta", requestId, text: "Réponse" });
    deliver({ type: "done", requestId, stopReason: "end_turn", usage: { inputTokens: 1, outputTokens: 1 }, bordereau: bordereau() });
    button("Enregistrer").click();
    await settle();
    expect(sendRequest).toHaveBeenCalledWith(
      "artifact/save",
      { draft: expect.objectContaining({ sourceType: "selection", markdown: "Réponse", tags: [] }) },
    );
  });

  it("hands over to the panel and shows the shortcut", async () => {
    await mount();
    await openCard();
    button("Expliquer").click();
    const requestId = connection.start.mock.calls[0]![0].requestId as string;
    deliver({ type: "done", requestId, stopReason: "end_turn", usage: { inputTokens: 1, outputTokens: 1 }, bordereau: bordereau() });
    button("Poursuivre").click();
    await settle();
    expect(sendRequest).toHaveBeenCalledWith("capture/run", { mode: "selection", handoff: true });
    expect(card().textContent).toContain("Ctrl+Maj+Y");
  });

  it("shows an error when the request fails", async () => {
    await mount();
    await openCard();
    button("Expliquer").click();
    const requestId = connection.start.mock.calls[0]![0].requestId as string;
    deliver({ type: "error", requestId, error: { kind: "auth" } });
    expect(text(".notice--error")).toContain("refusée");
    expect(connection.close).toHaveBeenCalled();
  });

  it("explains a missing key and cannot send", async () => {
    await mount({ hasKey: false });
    await openCard();
    expect(text(".notice")).toContain("Aucune clé API");
    expect(card().querySelector("a")).toBeNull();
    expect(button("Expliquer").disabled).toBe(true);
    expect(planContext).not.toHaveBeenCalled();
  });

  it("closes on Escape and aborts the Port", async () => {
    await mount();
    await openCard();
    button("Expliquer").click();
    window.dispatchEvent(trusted(new KeyboardEvent("keydown", { key: "Escape" })));
    expect(connection.cancel).toHaveBeenCalled();
    expect(connection.close).toHaveBeenCalled();
    expect(card().querySelector("[role=dialog]")).toBeNull();
  });

  it("ignores untrusted events dispatched by the page", async () => {
    await mount();
    await openCard();
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    document.body.dispatchEvent(new Event("pointerdown", { bubbles: true, composed: true }));
    expect(card().querySelector("[role=dialog]")).not.toBeNull();
  });

  it("closes on an outside click", async () => {
    await mount();
    await openCard();
    document.body.dispatchEvent(trusted(new Event("pointerdown", { bubbles: true, composed: true })));
    expect(card().querySelector("[role=dialog]")).toBeNull();
  });
});

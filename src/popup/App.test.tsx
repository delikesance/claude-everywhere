import { render } from "preact";
import { act } from "preact/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { manualPage } from "../extraction/manual";
import { openLibrary } from "../library";
import { initI18n } from "../shared/i18n";
import { AppException } from "../shared/errors";
import sharedFr from "../shared/locales/fr.json";
import { sendRequest } from "../shared/messaging";
import { ensureHostPermission } from "../shared/permissions";
import type { AppError, ExtractedPage } from "../shared/types";
import { App } from "./App";
import popupFr from "./locales/fr.json";

vi.mock("../shared/messaging", () => ({ sendRequest: vi.fn() }));
vi.mock("../shared/permissions", () => ({ ensureHostPermission: vi.fn() }));
vi.mock("../extraction/manual", () => ({ manualPage: vi.fn() }));
vi.mock("../library", () => ({ openLibrary: vi.fn() }));

const page: ExtractedPage = {
  url: "https://example.org/a",
  title: "Original title",
  siteName: null,
  lang: "fr",
  sourceType: "page",
  markdown: "Body of the page",
  charCount: 1234,
  capturedAt: 0,
  usedFallback: false,
};

const sidebarOpen = vi.fn(() => Promise.resolve());
const saveArtifact = vi.fn(() => Promise.resolve({}));
const root = document.body.appendChild(document.createElement("div"));

const fail = (error: AppError) => Promise.reject(new AppException(error));
const button = (label: string) =>
  [...root.querySelectorAll("button")].find((b) => b.textContent?.includes(label)) as HTMLButtonElement;
const field = (id: string) => root.querySelector<HTMLInputElement>(`#${id}`)!;

const settle = () => new Promise((resolve) => setTimeout(resolve));

async function click(label: string) {
  await act(async () => {
    button(label).click();
    await settle();
  });
}

async function typeInto(id: string, value: string) {
  await act(() => {
    const control = field(id);
    control.value = value;
    control.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

async function mount(config = { hasKey: true }) {
  vi.mocked(sendRequest).mockImplementation(((type: string) =>
    type === "overlay/config" ? Promise.resolve(config) : Promise.resolve(page)) as typeof sendRequest);
  await act(() => render(<App />, root));
}

beforeEach(async () => {
  Object.assign(globalThis, {
    browser: {
      sidebarAction: { open: sidebarOpen },
      runtime: { openOptionsPage: vi.fn(), getURL: (path: string) => path },
      tabs: { create: vi.fn() },
    },
  });
  vi.mocked(openLibrary).mockResolvedValue({ saveArtifact } as never);
  await initI18n("fr", { ...sharedFr, ...popupFr });
});

afterEach(async () => {
  await act(() => render(null, root));
  vi.clearAllMocks();
});

describe("popup", () => {
  it("shows the default actions", async () => {
    await mount();
    expect(root.textContent).toContain("Poser une question sur cette page");
    expect(button("Enregistrer cette page")).toBeTruthy();
    expect(button("Ouvrir la bibliothèque")).toBeTruthy();
  });

  it("opens the sidebar synchronously before any request", async () => {
    await mount();
    vi.mocked(sendRequest).mockClear();
    await click("Poser une question");
    const capture = vi.mocked(sendRequest).mock.invocationCallOrder[0]!;
    expect(sidebarOpen.mock.invocationCallOrder[0]).toBeLessThan(capture);
    expect(sendRequest).toHaveBeenCalledWith("capture/run", { mode: "page", handoff: true });
  });

  it("explains a missing key", async () => {
    await mount({ hasKey: false });
    expect(root.textContent).toContain("Aucune clé API enregistrée.");
  });

  it("saves the edited title and tags after a preview", async () => {
    await mount();
    await click("Enregistrer cette page");
    expect(sendRequest).toHaveBeenCalledWith("capture/run", { mode: "page", handoff: false });
    expect(root.textContent).toMatch(/1\s234 car\./);
    expect(root.textContent).toContain("Local");
    await typeInto("save-title", "Edited");
    await typeInto("save-tags", "a, b ,");
    await click("Enregistrer");
    expect(saveArtifact).toHaveBeenCalledWith({
      title: "Edited",
      url: page.url,
      sourceType: "page",
      tags: ["a", "b"],
      markdown: page.markdown,
    });
    expect(root.textContent).toContain("Page enregistrée");
  });

  it("falls back to the manual paste path on a restricted page", async () => {
    await mount();
    vi.mocked(sendRequest).mockImplementationOnce(() => fail({ kind: "restricted", message: "" }));
    await click("Enregistrer cette page");
    expect(root.textContent).toContain("Cette page ne peut pas être lue");
    vi.mocked(manualPage).mockReturnValue({ ...page, sourceType: "manual" });
    await typeInto("paste-text", "Pasted words");
    await click("Utiliser ce texte");
    expect(manualPage).toHaveBeenCalledWith("Pasted words");
    await click("Enregistrer");
    expect(saveArtifact).toHaveBeenCalledWith(expect.objectContaining({ sourceType: "note" }));
  });

  it("asks for host permission then retries", async () => {
    await mount();
    vi.mocked(sendRequest).mockImplementationOnce(() =>
      fail({ kind: "permission", message: "", origin: "https://files.example/*" }),
    );
    await click("Enregistrer cette page");
    vi.mocked(ensureHostPermission).mockResolvedValue(true);
    await click("Autoriser ce site");
    expect(ensureHostPermission).toHaveBeenCalledWith("https://files.example/*");
    expect(root.textContent).toContain("Aperçu avant enregistrement");
  });

  it("reports a refused permission", async () => {
    await mount();
    vi.mocked(sendRequest).mockImplementationOnce(() =>
      fail({ kind: "permission", message: "", origin: "https://files.example/*" }),
    );
    await click("Enregistrer cette page");
    vi.mocked(ensureHostPermission).mockResolvedValue(false);
    await click("Autoriser ce site");
    expect(root.textContent).toContain("Autorisation refusée.");
  });

  it("shows unreadable and generic errors", async () => {
    await mount();
    vi.mocked(sendRequest).mockImplementationOnce(() => fail({ kind: "empty", message: "" }));
    await click("Enregistrer cette page");
    expect(root.textContent).toContain("Page illisible");
    await click("Annuler");
    vi.mocked(sendRequest).mockImplementationOnce(() => fail({ kind: "network" }));
    await click("Enregistrer cette page");
    expect(root.textContent).toContain("Une erreur est survenue");
  });
});

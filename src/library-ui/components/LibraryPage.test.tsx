import { beforeEach, expect, it, vi } from "vitest";
import type { SearchHit } from "../../library";
import { t } from "../../shared/i18n";
import type { Artifact } from "../../shared/types";
import { byText, click, fakeLibrary, initFrench, installBrowserStub, mount, settle, typeInto } from "../testing";
import { LibraryPage } from "./LibraryPage";

const artifact: Artifact = {
  id: "a1",
  title: "Notes sur Rust",
  tags: ["code"],
  url: "https://example.org/rust",
  charCount: 1200,
  createdAt: 1_700_000_000_000,
  updatedAt: 1_700_000_000_000,
  currentVersionId: "v1",
} as Artifact;

const hit: SearchHit = {
  artifact,
  score: 1,
  snippets: [{ field: "text", before: "le ", hit: "borrow", after: " checker" }],
};

beforeEach(async () => {
  document.body.replaceChildren();
  installBrowserStub();
  await initFrench();
});

it("debounces the search and highlights the match", async () => {
  const library = fakeLibrary({ listArtifacts: vi.fn(async () => [artifact]), search: vi.fn(async () => [hit]) });
  const page = await mount(<LibraryPage library={library} />);
  await settle();

  await typeInto(page.querySelector<HTMLInputElement>("input[type=search]")!, "borrow");
  expect(library.search).not.toHaveBeenCalled();
  await settle(200);

  expect(library.search).toHaveBeenCalledWith("borrow", 50);
  expect(page.querySelector("mark.hit")?.textContent).toBe("borrow");
});

it("says nothing is in the margin when the search finds nothing", async () => {
  const library = fakeLibrary({ listArtifacts: vi.fn(async () => [artifact]) });
  const page = await mount(<LibraryPage library={library} />);
  await settle();

  await typeInto(page.querySelector<HTMLInputElement>("input[type=search]")!, "zzz");
  await settle(200);

  expect(page.textContent).toContain("Rien dans la marge pour");
});

it("attaches the selection to the context and opens the sidebar in the click", async () => {
  const library = fakeLibrary({ listArtifacts: vi.fn(async () => [artifact]) });
  const page = await mount(<LibraryPage library={library} />);
  await settle();

  await click(page.querySelector("input[type=checkbox]"));
  await click(byText(page, "button", "Ajouter au contexte"));

  const { storage, sidebarAction } = (globalThis as unknown as { browser: typeof browser }).browser;
  expect(storage.session.set).toHaveBeenCalledWith({ pendingAttach: ["a1"] });
  expect(sidebarAction.open).toHaveBeenCalledTimes(1);
});

it("reopens an entry in the conversation when its title is clicked", async () => {
  const library = fakeLibrary({ listArtifacts: vi.fn(async () => [artifact]) });
  const page = await mount(<LibraryPage library={library} />);
  await settle();

  await click(byText(page, "button", "Notes sur Rust"));

  const { storage, sidebarAction } = (globalThis as unknown as { browser: typeof browser }).browser;
  expect(storage.session.set).toHaveBeenCalledWith({ pendingAttach: ["a1"] });
  expect(sidebarAction.open).toHaveBeenCalledTimes(1);
});

it("downloads the selected artifacts as a bundle through a blob URL", async () => {
  const exportMarkdown = vi.fn(async () => ({ filename: "lot.md", mime: "text/markdown", content: "# x" }));
  const createObjectURL = vi.fn(() => "blob:x");
  Object.assign(URL, { createObjectURL, revokeObjectURL: vi.fn() });
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
  const library = fakeLibrary({ listArtifacts: vi.fn(async () => [artifact]), exportMarkdown });
  const page = await mount(<LibraryPage library={library} />);
  await settle();

  await click(page.querySelector("input[type=checkbox]"));
  await click(byText(page, "button", "Exporter le lot"));

  expect(exportMarkdown).toHaveBeenCalledWith(["a1"], true);
  expect(createObjectURL).toHaveBeenCalledTimes(1);
});

it("shows the import report", async () => {
  const importJson = vi.fn(async () => ({ artifacts: 2, versions: 3, conversations: 1, skipped: 0 }));
  const library = fakeLibrary({ listArtifacts: vi.fn(async () => [artifact]), importJson });
  const page = await mount(<LibraryPage library={library} />);
  await settle();

  const input = page.querySelector<HTMLInputElement>("input[type=file]")!;
  Object.defineProperty(input, "files", { value: [{ text: async () => "{}" }] });
  input.dispatchEvent(new Event("change", { bubbles: true }));
  await settle(10);

  expect(importJson).toHaveBeenCalledWith("{}");
  expect(page.textContent).toContain(t("library_ui_importReportTitle"));
});

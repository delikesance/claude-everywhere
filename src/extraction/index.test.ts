import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RESULT_SLOT } from "./constants";
import { extractTab, ExtractionError } from "./index";
import { readPage } from "./injected/read-page";
import { loadHtmlFixture, stubInnerText } from "./testing";

const PAGE_URL = "https://example.org/article";

const executeScript = vi.fn();
const getTab = vi.fn();
vi.mock("./pdf", () => ({ extractPdf: vi.fn(async (url: string) => ({ sourceType: "pdf", url })) }));

function stubBrowser(tabUrl: string): void {
  getTab.mockResolvedValue({ url: tabUrl });
  Object.assign(globalThis, { browser: { tabs: { get: getTab }, scripting: { executeScript } } });
}

async function kindOf(promise: Promise<unknown>): Promise<string | undefined> {
  const error = await promise.catch((e: unknown) => e);
  return error instanceof ExtractionError ? error.data.kind : undefined;
}

describe("extractTab", () => {
  beforeEach(() => {
    stubInnerText();
    executeScript.mockReset();
  });
  afterEach(() => Reflect.deleteProperty(globalThis, RESULT_SLOT));

  it("runs the injected script then collects its result", async () => {
    stubBrowser(PAGE_URL);
    loadHtmlFixture("article.html");
    executeScript.mockImplementationOnce(async () => {
      Object.assign(globalThis, { [RESULT_SLOT]: readPage(document) });
      return [{}];
    });
    executeScript.mockImplementationOnce(async ({ func, args }) => [{ result: func(...args) }]);
    const page = await extractTab(7, "page");
    expect(page.title).toBe("Lire dans la marge");
    expect(executeScript.mock.calls[0]?.[0]).toMatchObject({ target: { tabId: 7 }, files: ["injected/page.js"] });
    expect(RESULT_SLOT in globalThis).toBe(false);
  });

  it("raises the error data returned by the injected script", async () => {
    stubBrowser(PAGE_URL);
    executeScript.mockResolvedValueOnce([{}]).mockResolvedValueOnce([{ result: { kind: "empty", message: "x" } }]);
    expect(await kindOf(extractTab(1, "selection"))).toBe("empty");
    expect(executeScript.mock.calls[0]?.[0]).toMatchObject({ files: ["injected/selection.js"] });
  });

  it.each([
    "about:preferences",
    "moz-extension://abc/popup.html",
    "view-source:https://example.org",
    "https://addons.mozilla.org/fr/firefox/",
    "resource://pdf.js/web/viewer.html",
  ])("maps %s to a restricted error without injecting", async (url) => {
    stubBrowser(url);
    expect(await kindOf(extractTab(1, "page"))).toBe("restricted");
    expect(executeScript).not.toHaveBeenCalled();
  });

  it("maps an injection failure to a restricted error", async () => {
    stubBrowser(PAGE_URL);
    executeScript.mockRejectedValue(new Error("Missing host permission for the tab"));
    expect(await kindOf(extractTab(1, "page"))).toBe("restricted");
  });

  it("routes PDF tabs to the PDF extractor", async () => {
    stubBrowser("https://example.org/papers/a.PDF?download=1");
    expect(await extractTab(1, "page")).toMatchObject({ sourceType: "pdf" });
    expect(executeScript).not.toHaveBeenCalled();
  });
});

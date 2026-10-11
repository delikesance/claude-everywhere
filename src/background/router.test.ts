import { beforeEach, describe, expect, it, vi } from "vitest";
import { ExtractionError } from "../extraction";
import { AppException } from "../shared/errors";
import { EXTENSION_ID, EXTENSION_URL, installBrowserFake, pageFixture } from "./browser-fake";

const mocks = vi.hoisted(() => ({
  validateKey: vi.fn(),
  extractTab: vi.fn(),
  extractPdf: vi.fn(),
  saveArtifact: vi.fn(),
}));
vi.mock("../api", () => ({ validateKey: mocks.validateKey }));
vi.mock("../extraction", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../extraction")>()),
  extractTab: mocks.extractTab,
  extractPdf: mocks.extractPdf,
}));
vi.mock("../library", () => ({ openLibrary: async () => ({ saveArtifact: mocks.saveArtifact }) }));

import { STORAGE_KEYS } from "../shared/constants";
import { routeMessage } from "./router";

const extensionPage = { id: EXTENSION_ID, url: `${EXTENSION_URL}popup.html` };
const contentScript = { id: EXTENSION_ID, tab: { id: 3 }, url: "https://example.org/" } as never;
const draft = { title: "T", url: null, sourceType: "selection", tags: [], markdown: "m" };

describe("router", () => {
  let fake: ReturnType<typeof installBrowserFake>;
  beforeEach(() => {
    vi.resetAllMocks();
    fake = installBrowserFake();
  });

  it("validates a key", async () => {
    mocks.validateKey.mockResolvedValue(undefined);
    expect(await routeMessage({ type: "key/validate", apiKey: "sk" }, extensionPage)).toEqual({
      ok: true,
      value: { valid: true },
    });
    expect(mocks.validateKey).toHaveBeenCalledWith("sk");
  });

  it("maps an api error to an error result", async () => {
    mocks.validateKey.mockRejectedValue(new AppException({ kind: "auth" }));
    expect(await routeMessage({ type: "key/validate", apiKey: "sk" }, extensionPage)).toEqual({
      ok: false,
      error: { kind: "auth" },
    });
  });

  it("maps a restricted page to a typed error result", async () => {
    const data = { kind: "restricted", message: "about:" } as const;
    mocks.extractTab.mockRejectedValue(new ExtractionError(data));
    expect(await routeMessage({ type: "capture/run", mode: "page", tabId: 1, handoff: false }, extensionPage)).toEqual({
      ok: false,
      error: data,
    });
  });

  it("runs a capture and stores the handoff", async () => {
    mocks.extractTab.mockResolvedValue(pageFixture);
    const result = await routeMessage({ type: "capture/run", mode: "page", tabId: 1, handoff: true }, extensionPage);
    expect(result).toEqual({ ok: true, value: pageFixture });
    expect(mocks.extractTab).toHaveBeenCalledWith(1, "page");
    expect(fake.storage.session.store.get(STORAGE_KEYS.pendingCapture)).toEqual(pageFixture);
  });

  it("hands the pending capture over exactly once", async () => {
    fake.storage.session.store.set(STORAGE_KEYS.pendingCapture, pageFixture);
    const take = () => routeMessage({ type: "capture/takePending" }, extensionPage);
    expect(await take()).toEqual({ ok: true, value: pageFixture });
    expect(await take()).toEqual({ ok: true, value: null });
  });

  it("extracts a pdf and saves an artifact", async () => {
    mocks.extractPdf.mockResolvedValue(pageFixture);
    mocks.saveArtifact.mockResolvedValue({ id: "a" });
    expect(await routeMessage({ type: "pdf/extract", url: "https://x/y.pdf" }, extensionPage)).toEqual({
      ok: true,
      value: pageFixture,
    });
    expect(await routeMessage({ type: "artifact/save", draft }, extensionPage)).toEqual({ ok: true, value: { id: "a" } });
  });

  it("rejects a malformed draft", async () => {
    const result = await routeMessage({ type: "artifact/save", draft: { title: 1 } }, extensionPage);
    expect(result).toMatchObject({ ok: false, error: { kind: "bad_request" } });
    expect(mocks.saveArtifact).not.toHaveBeenCalled();
  });

  it("reports overlay config without ever exposing the key", async () => {
    fake.storage.local.store.set(STORAGE_KEYS.settings, { apiKey: "sk-secret" });
    const result = await routeMessage({ type: "overlay/config" }, contentScript);
    expect(result).toMatchObject({ ok: true, value: { hasKey: true } });
    expect(JSON.stringify(result)).not.toContain("sk-secret");
  });

  it("rejects unknown types and foreign senders", async () => {
    expect(await routeMessage({ type: "nope" }, extensionPage)).toMatchObject({ ok: false });
    expect(await routeMessage("text", extensionPage)).toMatchObject({ ok: false });
    expect(await routeMessage({ type: "overlay/config" }, { id: "other@ext" })).toMatchObject({ ok: false });
  });

  describe("content-script sender", () => {
    it.each([
      [{ type: "key/validate", apiKey: "sk" }],
      [{ type: "capture/takePending" }],
      [{ type: "pdf/extract", url: "https://x/y.pdf" }],
      [{ type: "capture/run", mode: "page", handoff: true }],
    ])("is refused %j", async (message) => {
      expect(await routeMessage(message, contentScript)).toMatchObject({ ok: false });
      expect(mocks.validateKey).not.toHaveBeenCalled();
      expect(mocks.extractTab).not.toHaveBeenCalled();
    });

    it("may capture its own selection only", async () => {
      mocks.extractTab.mockResolvedValue(pageFixture);
      const message = { type: "capture/run", mode: "selection", tabId: 99, handoff: true };
      expect(await routeMessage(message, contentScript)).toMatchObject({ ok: true });
      expect(mocks.extractTab).toHaveBeenCalledWith(3, "selection");
    });
  });
});

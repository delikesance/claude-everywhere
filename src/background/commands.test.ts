import { beforeEach, describe, expect, it, vi } from "vitest";
import { installBrowserFake, pageFixture } from "./browser-fake";

const mocks = vi.hoisted(() => ({ extractTab: vi.fn(), extractPdf: vi.fn(), saveArtifact: vi.fn() }));
vi.mock("../extraction", () => ({ extractTab: mocks.extractTab, extractPdf: mocks.extractPdf, ExtractionError: class {} }));
vi.mock("../library", () => ({ openLibrary: async () => ({ saveArtifact: mocks.saveArtifact }) }));
vi.mock("../shared/i18n", () => ({ initI18n: vi.fn(async () => undefined), t: (key: string) => `t:${key}` }));

import { BADGE_DURATION_MS } from "./badge";
import { onCommand } from "./commands";
import { createMenus, onMenuClicked } from "./menus";

const tab = { id: 7, url: "https://example.org/a" } as never;
const click = (menuItemId: string) => onMenuClicked({ menuItemId } as never, tab);

describe("commands and menus", () => {
  let fake: ReturnType<typeof installBrowserFake>;
  beforeEach(() => {
    vi.resetAllMocks();
    fake = installBrowserFake();
    mocks.extractTab.mockResolvedValue(pageFixture);
  });

  it("creates the three menu entries with translated titles", async () => {
    await createMenus();
    expect(fake.menus.create.mock.calls.map(([entry]) => entry.id)).toEqual(["explain-selection", "ask-page", "save-page"]);
    expect(fake.menus.create.mock.calls[0]?.[0].title).toBe("t:background_menuExplain");
  });

  it("opens the sidebar synchronously from the ask-page menu and hands the capture over", async () => {
    click("ask-page");
    expect(fake.sidebarAction.open).toHaveBeenCalledTimes(1);
    expect(mocks.extractTab).not.toHaveBeenCalled();
    await vi.waitFor(() => expect(fake.storage.session.set).toHaveBeenCalled());
    expect(mocks.extractTab).toHaveBeenCalledWith(7, "page");
  });

  it("does not open the sidebar for the other entries", async () => {
    onCommand("explain-selection", tab);
    onCommand("save-page", tab);
    click("save-page");
    await vi.waitFor(() => expect(mocks.saveArtifact).toHaveBeenCalled());
    expect(fake.sidebarAction.open).not.toHaveBeenCalled();
  });

  it("injects the overlay then shows it on explain-selection", async () => {
    onCommand("explain-selection", tab);
    await vi.waitFor(() => expect(fake.tabs.sendMessage).toHaveBeenCalledWith(7, { type: "overlay/show" }));
    expect(fake.scripting.executeScript).toHaveBeenCalledWith({ target: { tabId: 7 }, files: ["overlay.js"] });
  });

  it("flashes OK then clears the badge after saving", async () => {
    vi.useFakeTimers();
    try {
      mocks.saveArtifact.mockResolvedValue({ id: "a" });
      onCommand("save-page", tab);
      await vi.waitFor(() => expect(fake.action.setBadgeText).toHaveBeenCalledWith({ text: "OK", tabId: 7 }));
      expect(mocks.saveArtifact).toHaveBeenCalledWith(expect.objectContaining({ url: pageFixture.url, sourceType: "page" }));
      vi.advanceTimersByTime(BADGE_DURATION_MS);
      expect(fake.action.setBadgeText).toHaveBeenLastCalledWith({ text: "", tabId: 7 });
    } finally {
      vi.useRealTimers();
    }
  });

  it("uses the pdf extractor for pdf tabs", async () => {
    mocks.extractPdf.mockResolvedValue({ ...pageFixture, sourceType: "pdf" });
    onCommand("save-page", { id: 7, url: "https://example.org/doc.PDF" } as never);
    await vi.waitFor(() => expect(mocks.saveArtifact).toHaveBeenCalledWith(expect.objectContaining({ sourceType: "pdf" })));
    expect(mocks.extractTab).not.toHaveBeenCalled();
  });

  it("shows an error badge when extraction fails", async () => {
    mocks.extractTab.mockRejectedValue(new Error("restricted"));
    onCommand("save-page", tab);
    await vi.waitFor(() => expect(fake.action.setBadgeText).toHaveBeenCalledWith({ text: "!", tabId: 7 }));
    expect(mocks.saveArtifact).not.toHaveBeenCalled();
  });
});

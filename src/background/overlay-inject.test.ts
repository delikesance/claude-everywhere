import { beforeEach, describe, expect, it, vi } from "vitest";
import { STORAGE_KEYS } from "../shared/constants";
import { installBrowserFake } from "./browser-fake";

vi.mock("../shared/i18n", () => ({ initI18n: vi.fn(async () => undefined), t: (key: string) => key }));

import { onInstalled } from "./install";
import { onStorageChanged, syncOverlayRegistration } from "./overlay-inject";

describe("persistent overlay registration", () => {
  let fake: ReturnType<typeof installBrowserFake>;
  beforeEach(() => {
    fake = installBrowserFake();
  });

  const setting = (overlayAllSites: boolean) => fake.storage.local.store.set(STORAGE_KEYS.settings, { overlayAllSites });

  it("registers when the setting is on and the permission granted", async () => {
    setting(true);
    await syncOverlayRegistration();
    expect(fake.scripting.registerContentScripts).toHaveBeenCalledWith([
      expect.objectContaining({ js: ["overlay.js"], matches: ["<all_urls>"], runAt: "document_idle" }),
    ]);
  });

  it("does not register without the permission", async () => {
    setting(true);
    fake.permissions.contains.mockResolvedValue(false);
    await syncOverlayRegistration();
    expect(fake.scripting.registerContentScripts).not.toHaveBeenCalled();
  });

  it("does not register twice", async () => {
    setting(true);
    fake.scripting.getRegisteredContentScripts.mockResolvedValue([{ id: "overlay-all-sites" }]);
    await syncOverlayRegistration();
    expect(fake.scripting.registerContentScripts).not.toHaveBeenCalled();
  });

  it("unregisters when the setting is turned off or the permission removed", async () => {
    fake.scripting.getRegisteredContentScripts.mockResolvedValue([{ id: "overlay-all-sites" }]);
    setting(false);
    await syncOverlayRegistration();
    setting(true);
    fake.permissions.contains.mockResolvedValue(false);
    await syncOverlayRegistration();
    expect(fake.scripting.unregisterContentScripts).toHaveBeenCalledTimes(2);
  });

  it("re-syncs only on settings changes in local storage", async () => {
    setting(true);
    await onStorageChanged({ other: {} }, "local");
    await onStorageChanged({ [STORAGE_KEYS.settings]: {} }, "session");
    expect(fake.scripting.registerContentScripts).not.toHaveBeenCalled();
    await onStorageChanged({ [STORAGE_KEYS.settings]: {} }, "local");
    expect(fake.scripting.registerContentScripts).toHaveBeenCalledTimes(1);
  });

  it("opens no tab on install and creates the context menus", async () => {
    await onInstalled();
    expect(fake.tabs.create).not.toHaveBeenCalled();
    expect(fake.contextMenus.create).toHaveBeenCalled();
  });
});

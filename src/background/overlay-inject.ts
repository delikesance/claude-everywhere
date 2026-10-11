import { STORAGE_KEYS } from "../shared/constants";
import type { TabMessage } from "../shared/messages";
import { hasHostPermission } from "../shared/permissions";
import { getSettings } from "../shared/settings";
import { withErrorBadge } from "./badge";
import { resolveTabId } from "./capture";

const OVERLAY_SCRIPT = "overlay.js";
const OVERLAY_SCRIPT_ID = "overlay-all-sites";
const ALL_URLS = "<all_urls>";
const SHOW_OVERLAY: TabMessage = { type: "overlay/show" };

export async function showOverlay(tabId: number): Promise<void> {
  await browser.scripting.executeScript({ target: { tabId }, files: [OVERLAY_SCRIPT] });
  await browser.tabs.sendMessage(tabId, SHOW_OVERLAY);
}

export async function explainSelection(tab: browser.tabs.Tab | undefined): Promise<void> {
  await withErrorBadge(tab?.id, async () => showOverlay(await resolveTabId(tab?.id)));
}

async function isRegistered(): Promise<boolean> {
  const scripts = await browser.scripting.getRegisteredContentScripts({ ids: [OVERLAY_SCRIPT_ID] });
  return scripts.length > 0;
}

export async function syncOverlayRegistration(): Promise<void> {
  const wanted = (await getSettings()).overlayAllSites && (await hasHostPermission(ALL_URLS));
  const registered = await isRegistered();
  if (wanted && !registered) {
    await browser.scripting.registerContentScripts([
      {
        id: OVERLAY_SCRIPT_ID,
        js: [OVERLAY_SCRIPT],
        matches: [ALL_URLS],
        runAt: "document_idle",
        persistAcrossSessions: true,
      },
    ]);
  } else if (!wanted && registered) {
    await browser.scripting.unregisterContentScripts({ ids: [OVERLAY_SCRIPT_ID] });
  }
}

export async function onStorageChanged(changes: Record<string, unknown>, area: string): Promise<void> {
  if (area === "local" && STORAGE_KEYS.settings in changes) await syncOverlayRegistration();
}

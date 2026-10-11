import { createMenus } from "./menus";
import { syncOverlayRegistration } from "./overlay-inject";

const ONBOARDING_PAGE = "onboarding.html";

export async function onInstalled(details: { reason: string }): Promise<void> {
  if (details.reason === "install") await browser.tabs.create({ url: browser.runtime.getURL(ONBOARDING_PAGE) });
  await createMenus();
  await syncOverlayRegistration();
}

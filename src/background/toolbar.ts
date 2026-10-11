import { handOffPage } from "./capture";

export async function onToolbarClicked(tab: browser.tabs.Tab | undefined): Promise<void> {
  await browser.sidebarAction.toggle();
  if (await browser.sidebarAction.isOpen({})) await handOffPage(tab);
}

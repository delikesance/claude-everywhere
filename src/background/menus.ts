import { initI18n, t } from "../shared/i18n";
import type { MessageKey } from "../shared/i18n";
import { getSettings } from "../shared/settings";
import { handOffPage } from "./capture";
import { explainSelection } from "./overlay-inject";
import { savePage } from "./save-page";

interface MenuEntry {
  id: string;
  titleKey: MessageKey;
  contexts: browser.menus.ContextType[];
}

export const MENU_EXPLAIN = "explain-selection";
export const MENU_ASK_PAGE = "ask-page";
export const MENU_SAVE_PAGE = "save-page";

const ENTRIES: MenuEntry[] = [
  { id: MENU_EXPLAIN, titleKey: "background_menuExplain", contexts: ["selection"] },
  { id: MENU_ASK_PAGE, titleKey: "background_menuAskPage", contexts: ["page", "selection"] },
  { id: MENU_SAVE_PAGE, titleKey: "background_menuSavePage", contexts: ["page", "selection"] },
];

export async function createMenus(): Promise<void> {
  await initI18n((await getSettings()).uiLocale);
  await browser.contextMenus.removeAll();
  for (const { id, titleKey, contexts } of ENTRIES) {
    browser.contextMenus.create({ id, title: t(titleKey), contexts });
  }
}

function askAboutPage(tab: browser.tabs.Tab | undefined): void {
  void browser.sidebarAction.open();
  void handOffPage(tab);
}

export function onMenuClicked(info: browser.menus.OnClickData, tab: browser.tabs.Tab | undefined): void {
  if (info.menuItemId === MENU_ASK_PAGE) askAboutPage(tab);
  else if (info.menuItemId === MENU_EXPLAIN) void explainSelection(tab);
  else if (info.menuItemId === MENU_SAVE_PAGE) void savePage(tab);
}

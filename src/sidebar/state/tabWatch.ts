import { signal } from "@preact/signals";

export interface WatchedTab {
  title: string;
  url: string;
}

export const changedTab = signal<WatchedTab | null>(null);

export function watchTabChanges(): void {
  watchActiveTab((tab) => {
    changedTab.value = tab;
  });
}

export function watchActiveTab(onChange: (tab: WatchedTab) => void): () => void {
  const report = (tab: browser.tabs.Tab) => onChange({ title: tab.title ?? "", url: tab.url ?? "" });

  const onActivated = async ({ tabId }: { tabId: number }) => {
    const tab = await browser.tabs.get(tabId).catch(() => undefined);
    if (tab) report(tab);
  };
  const onUpdated = (_tabId: number, changeInfo: browser.tabs._OnUpdatedChangeInfo, tab: browser.tabs.Tab) => {
    if (tab.active && changeInfo.url !== undefined) report(tab);
  };

  browser.tabs.onActivated.addListener(onActivated);
  browser.tabs.onUpdated.addListener(onUpdated);
  return () => {
    browser.tabs.onActivated.removeListener(onActivated);
    browser.tabs.onUpdated.removeListener(onUpdated);
  };
}

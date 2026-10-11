export const openOptions = (): void => void browser.runtime.openOptionsPage();

export const openLibraryPage = (): void =>
  void browser.tabs.create({ url: browser.runtime.getURL("library-ui.html") });

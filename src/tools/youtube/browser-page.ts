export interface PlayerPage {
  url: string;
  lang: string;
  currentTime: number | null;
  player: unknown;
}

// Injected functions are serialised, so they must not reference module scope.
function readPlayerPage(): PlayerPage {
  const video = document.querySelector("video");
  return {
    url: location.href,
    lang: document.documentElement.lang,
    currentTime: video ? video.currentTime : null,
    player: (globalThis as { ytInitialPlayerResponse?: unknown }).ytInitialPlayerResponse,
  };
}

function fetchText(url: string): Promise<string> {
  return fetch(url).then((response) => response.text());
}

export async function readVideoPage(tabId: number): Promise<PlayerPage> {
  const [injection] = await browser.scripting.executeScript({ target: { tabId }, world: "MAIN", func: readPlayerPage });
  if (!injection?.result) throw new Error("the page could not be read");
  return injection.result as PlayerPage;
}

export async function fetchInTab(tabId: number, url: string): Promise<string> {
  const [injection] = await browser.scripting.executeScript({ target: { tabId }, world: "MAIN", func: fetchText, args: [url] });
  return typeof injection?.result === "string" ? injection.result : "";
}

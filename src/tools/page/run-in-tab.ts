import { isRestrictedUrl } from "../../extraction/restricted";

export async function runInTab<A extends unknown[], R>(tabId: number, func: (...args: A) => R, args: A): Promise<R> {
  const { url = "" } = await browser.tabs.get(tabId);
  if (isRestrictedUrl(url)) throw new Error("This page cannot be read");
  const [injection] = await browser.scripting.executeScript({ target: { tabId }, func, args });
  return injection?.result as R;
}

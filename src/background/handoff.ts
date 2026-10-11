import { STORAGE_KEYS } from "../shared/constants";
import type { ExtractedPage } from "../shared/types";

export async function storePendingCapture(page: ExtractedPage): Promise<void> {
  await browser.storage.session.set({ [STORAGE_KEYS.pendingCapture]: page });
}

export async function takePendingCapture(): Promise<ExtractedPage | null> {
  const key = STORAGE_KEYS.pendingCapture;
  const stored = await browser.storage.session.get(key);
  if (stored[key] === undefined) return null;
  await browser.storage.session.remove(key);
  return stored[key] as ExtractedPage;
}

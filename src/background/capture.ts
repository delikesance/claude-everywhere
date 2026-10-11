import { extractPdf, extractTab } from "../extraction";
import type { CaptureMode } from "../shared/messages";
import type { ExtractedPage } from "../shared/types";
import { storePendingCapture } from "./handoff";

export interface CaptureRequest {
  mode: CaptureMode;
  tabId?: number | undefined;
  handoff: boolean;
}

export async function resolveTabId(tabId?: number): Promise<number> {
  if (tabId !== undefined) return tabId;
  const [active] = await browser.tabs.query({ active: true, currentWindow: true });
  if (active?.id === undefined) throw new Error("no active tab");
  return active.id;
}

export async function runCapture({ mode, tabId, handoff }: CaptureRequest): Promise<ExtractedPage> {
  const page = await extractTab(await resolveTabId(tabId), mode);
  if (handoff) await storePendingCapture(page);
  return page;
}

function isPdfUrl(url: string | undefined): url is string {
  if (url === undefined || !URL.canParse(url)) return false;
  return new URL(url).pathname.toLowerCase().endsWith(".pdf");
}

export function extractForSave(tabId: number, url: string | undefined): Promise<ExtractedPage> {
  return isPdfUrl(url) ? extractPdf(url) : extractTab(tabId, "page");
}

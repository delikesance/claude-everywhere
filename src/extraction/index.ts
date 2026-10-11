import type { CaptureMode } from "../shared/messages";
import type { ExtractedPage, ExtractionErrorData } from "../shared/types";
import { RESULT_SLOT } from "./constants";
import { errorData, ExtractionError } from "./error";
import { extractPdf } from "./pdf";
import { isPdfUrl, isRestrictedUrl } from "./restricted";

export { ExtractionError, extractPdf };

const INJECTED_FILES: Record<CaptureMode, string> = {
  page: "injected/page.js",
  selection: "injected/selection.js",
};

type InjectedResult = ExtractedPage | ExtractionErrorData | undefined;

const restricted = () => new ExtractionError(errorData("restricted", "This page cannot be read"));

function takeResult(slot: string): unknown {
  const holder = globalThis as unknown as Record<string, unknown>;
  const result = holder[slot];
  delete holder[slot];
  return result;
}

async function runInjected(tabId: number, mode: CaptureMode): Promise<InjectedResult> {
  const target = { tabId };
  try {
    await browser.scripting.executeScript({ target, files: [INJECTED_FILES[mode]] });
    const [injection] = await browser.scripting.executeScript({ target, func: takeResult, args: [RESULT_SLOT] });
    return injection?.result as InjectedResult;
  } catch {
    throw restricted();
  }
}

export async function extractTab(tabId: number, mode: CaptureMode): Promise<ExtractedPage> {
  const { url = "" } = await browser.tabs.get(tabId);
  if (mode === "page" && isPdfUrl(url)) return extractPdf(url);
  if (isRestrictedUrl(url)) throw restricted();
  const result = await runInjected(tabId, mode);
  if (!result) throw new ExtractionError(errorData("unreadable", "The page returned no content"));
  if ("kind" in result) throw new ExtractionError(result);
  return result;
}

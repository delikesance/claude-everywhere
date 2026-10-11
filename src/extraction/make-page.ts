import type { ExtractedPage } from "../shared/types";

type PageFields = Pick<ExtractedPage, "url" | "title" | "sourceType" | "markdown"> &
  Partial<Pick<ExtractedPage, "siteName" | "lang" | "usedFallback">>;

export function makePage(fields: PageFields): ExtractedPage {
  return {
    siteName: null,
    lang: null,
    usedFallback: false,
    ...fields,
    charCount: fields.markdown.length,
    capturedAt: Date.now(),
  };
}

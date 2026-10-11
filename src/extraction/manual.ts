import type { ExtractedPage } from "../shared/types";
import { makePage } from "./make-page";

export function manualPage(text: string, title = ""): ExtractedPage {
  return makePage({ url: "", title, sourceType: "manual", markdown: text.trim() });
}

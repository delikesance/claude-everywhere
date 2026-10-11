import { Readability } from "@mozilla/readability";
import TurndownService from "turndown";
import type { ExtractedPage, ExtractionErrorData } from "../../shared/types";
import { MIN_ARTICLE_CHARS } from "../constants";
import { errorData } from "../error";
import { makePage } from "../make-page";
import { documentFields } from "./document-fields";

const turndown = new TurndownService({ headingStyle: "atx", codeBlockStyle: "fenced", bulletListMarker: "-" });
turndown.remove(["script", "style", "noscript", "iframe"]);

function readArticle(doc: Document) {
  const article = new Readability(doc.cloneNode(true) as Document).parse();
  const { content, textContent } = article ?? {};
  if (!article || !content || (textContent ?? "").trim().length < MIN_ARTICLE_CHARS) return null;
  return { html: content, title: article.title, siteName: article.siteName };
}

export function readPage(doc: Document): ExtractedPage | ExtractionErrorData {
  const fields = documentFields(doc);
  const article = readArticle(doc);
  if (article) {
    return makePage({
      ...fields,
      title: doc.title.trim() || article.title || fields.url,
      siteName: article.siteName ?? null,
      sourceType: "page",
      markdown: turndown.turndown(article.html).trim(),
    });
  }
  const text = doc.body?.innerText.trim() ?? "";
  if (!text) return errorData("empty", "The page has no readable text");
  return makePage({ ...fields, sourceType: "page", markdown: text, usedFallback: true });
}

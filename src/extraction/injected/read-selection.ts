import type { ExtractedPage, ExtractionErrorData } from "../../shared/types";
import { errorData } from "../error";
import { makePage } from "../make-page";
import { documentFields } from "./document-fields";

function fieldSelection(doc: Document): string {
  const field = doc.activeElement;
  const isTextField =
    field instanceof HTMLTextAreaElement || (field instanceof HTMLInputElement && field.type !== "password");
  if (!isTextField || field.selectionStart === null || field.selectionEnd === null) return "";
  return field.value.slice(field.selectionStart, field.selectionEnd);
}

function selectedText(doc: Document): string {
  const own = (fieldSelection(doc) || doc.getSelection()?.toString() || "").trim();
  if (own) return own;
  for (const frame of doc.querySelectorAll("iframe")) {
    const inner = frame.contentDocument ? selectedText(frame.contentDocument) : "";
    if (inner) return inner;
  }
  return "";
}

export function readSelection(doc: Document): ExtractedPage | ExtractionErrorData {
  const text = selectedText(doc);
  if (!text) return errorData("empty", "Nothing is selected");
  return makePage({ ...documentFields(doc), sourceType: "selection", markdown: text });
}

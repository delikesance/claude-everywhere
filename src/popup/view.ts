import { AppException } from "../shared/errors";
import type { ArtifactDraft, ExtractedPage, SourceType } from "../shared/types";

export type View =
  | { name: "home" }
  | { name: "working" }
  | { name: "nokey" }
  | { name: "restricted" }
  | { name: "permission"; origin: string }
  | { name: "unreadable" }
  | { name: "error" }
  | { name: "preview"; page: ExtractedPage }
  | { name: "saved" };

const SOURCE_TYPE: Record<ExtractedPage["sourceType"], SourceType> = {
  page: "page",
  selection: "selection",
  pdf: "pdf",
  manual: "note",
};

export function viewForError(error: unknown): View {
  if (!(error instanceof AppException)) return { name: "error" };
  const failure = error.error;
  switch (failure.kind) {
    case "no_key":
      return { name: "nokey" };
    case "restricted":
      return { name: "restricted" };
    case "permission":
      return failure.origin ? { name: "permission", origin: failure.origin } : { name: "error" };
    case "unreadable":
    case "empty":
      return { name: "unreadable" };
    default:
      return { name: "error" };
  }
}

export function parseTags(text: string): string[] {
  return text
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export function toDraft(page: ExtractedPage, title: string, tagsText: string): ArtifactDraft {
  return {
    title: title.trim() || page.title,
    url: page.url,
    sourceType: SOURCE_TYPE[page.sourceType],
    tags: parseTags(tagsText),
    markdown: page.markdown,
  };
}

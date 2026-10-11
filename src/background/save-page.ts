import { openLibrary } from "../library";
import type { ArtifactDraft, ExtractedPage, SourceType } from "../shared/types";
import { flashSuccess, withErrorBadge } from "./badge";
import { extractForSave, resolveTabId } from "./capture";

const SOURCE_TYPE_OF: Record<ExtractedPage["sourceType"], SourceType> = {
  page: "page",
  selection: "selection",
  pdf: "pdf",
  manual: "note",
};

function toDraft(page: ExtractedPage): ArtifactDraft {
  return {
    title: page.title,
    url: page.url,
    sourceType: SOURCE_TYPE_OF[page.sourceType],
    tags: [],
    markdown: page.markdown,
  };
}

export async function savePage(tab: browser.tabs.Tab | undefined): Promise<void> {
  await withErrorBadge(tab?.id, async () => {
    const tabId = await resolveTabId(tab?.id);
    const page = await extractForSave(tabId, tab?.url);
    await (await openLibrary()).saveArtifact(toDraft(page));
    await flashSuccess(tabId);
  });
}

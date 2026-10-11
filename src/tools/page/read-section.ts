import type { ToolDef } from "../types";
import { htmlToMarkdown } from "./to-markdown";
import { runInTab } from "./run-in-tab";

// Runs inside the page: must stay self-contained (no imports, no module-level helpers).
// Returns the section HTML from its heading up to the next heading of same or higher level.
export function sectionHtmlInPage(id: string, doc: Document = document): string | null {
  const headings = Array.from(doc.querySelectorAll("h1,h2,h3,h4"));
  const index = headings.findIndex((_, position) => `s${position + 1}` === id);
  const start = headings[index];
  if (!start) return null;
  const level = Number(start.tagName[1]);
  const next = headings.slice(index + 1).find((heading) => Number(heading.tagName[1]) <= level);
  const range = doc.createRange();
  range.setStartBefore(start);
  if (next) range.setEndBefore(next);
  else range.setEnd(doc.body, doc.body.childNodes.length);
  const holder = doc.createElement("div");
  holder.append(range.cloneContents());
  return holder.innerHTML;
}

export const readSectionTool: ToolDef = {
  name: "read_section",
  description:
    "Read the text of one section of the current page as Markdown, from its heading to the next heading of same or higher level. Ids come from page_outline.",
  inputSchema: {
    type: "object",
    properties: { id: { type: "string", description: "Section id from page_outline, e.g. s3" } },
    required: ["id"],
  },
  async run(input, ctx) {
    const id = String(input.id ?? "");
    const html = await runInTab(ctx.tabId, sectionHtmlInPage, [id]);
    if (html === null) throw new Error(`Unknown section ${id}`);
    return htmlToMarkdown(html);
  },
};

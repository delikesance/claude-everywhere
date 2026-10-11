import type { ToolDef } from "../types";
import { runInTab } from "./run-in-tab";

export interface OutlineHeading {
  id: string;
  level: number;
  text: string;
}

export interface PageOutline {
  headings: OutlineHeading[];
  tables: number;
  links: number;
  chars: number;
}

// Runs inside the page: must stay self-contained (no imports, no module-level helpers).
export function outlinePage(doc: Document = document): PageOutline {
  const collapse = (text: string | null) => (text ?? "").replace(/\s+/g, " ").trim();
  const headings = Array.from(doc.querySelectorAll("h1,h2,h3,h4"), (heading, index) => ({
    id: `s${index + 1}`,
    level: Number(heading.tagName[1]),
    text: collapse(heading.textContent),
  }));
  return {
    headings,
    tables: doc.querySelectorAll("table").length,
    links: doc.querySelectorAll("a[href]").length,
    chars: collapse(doc.body?.textContent ?? null).length,
  };
}

function formatOutline(outline: PageOutline): string {
  const lines = outline.headings.map((heading) => `${heading.id} ${"#".repeat(heading.level)} ${heading.text}`);
  return [...lines, `tables: ${outline.tables}, links: ${outline.links}, chars: ${outline.chars}`].join("\n");
}

export const pageOutlineTool: ToolDef = {
  name: "page_outline",
  description:
    "List the headings (h1-h4) of the current page with their section ids, and count its tables, links and characters. Use the ids with read_section.",
  inputSchema: { type: "object", properties: {} },
  async run(_input, ctx) {
    return formatOutline(await runInTab(ctx.tabId, outlinePage, []));
  },
};

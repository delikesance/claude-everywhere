import type { ToolDef } from "../types";
import { runInTab } from "./run-in-tab";

export interface PageHit {
  sectionId: string | null;
  snippet: string;
}

const CONTEXT_CHARS = 60;
export const MAX_HITS = 20;

// Runs inside the page: must stay self-contained (no imports, no module-level helpers).
// The query must be non-empty.
export function findInPagePage(query: string, maxResults: number, doc: Document = document): PageHit[] {
  const needle = query.toLowerCase();
  const headings = Array.from(doc.querySelectorAll("h1,h2,h3,h4"));
  const sectionOf = (node: Node): string | null => {
    const preceding = headings.filter((heading) => heading.compareDocumentPosition(node) & Node.DOCUMENT_POSITION_FOLLOWING);
    const last = preceding.at(-1);
    return last ? `s${headings.indexOf(last) + 1}` : null;
  };
  const hits: PageHit[] = [];
  const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node && hits.length < maxResults; node = walker.nextNode()) {
    if (node.parentElement?.closest("script,style,noscript")) continue;
    const text = (node.textContent ?? "").replace(/\s+/g, " ");
    const lower = text.toLowerCase();
    let at = lower.indexOf(needle);
    while (at >= 0 && hits.length < maxResults) {
      const from = Math.max(0, at - CONTEXT_CHARS);
      const to = at + needle.length + CONTEXT_CHARS;
      hits.push({ sectionId: sectionOf(node), snippet: text.slice(from, to).trim() });
      at = lower.indexOf(needle, at + needle.length);
    }
  }
  return hits;
}

function formatHits(query: string, hits: PageHit[]): string {
  if (hits.length === 0) return `No match for "${query}".`;
  return hits.map((hit) => `[${hit.sectionId ?? "-"}] ...${hit.snippet}...`).join("\n");
}

export const findInPageTool: ToolDef = {
  name: "find_in_page",
  description:
    "Find occurrences of a text in the current page (case-insensitive) with surrounding context and the enclosing section id from page_outline.",
  inputSchema: {
    type: "object",
    properties: {
      query: { type: "string", description: "Text to search for" },
      maxResults: { type: "number", description: `Maximum occurrences, 1-${MAX_HITS} (default 10)` },
    },
    required: ["query"],
  },
  async run(input, ctx) {
    const query = String(input.query ?? "");
    if (!query) throw new Error("query is required");
    const requested = Number(input.maxResults ?? 10);
    const maxResults = Number.isNaN(requested) ? 10 : Math.min(Math.max(1, Math.floor(requested)), MAX_HITS);
    return formatHits(query, await runInTab(ctx.tabId, findInPagePage, [query, maxResults]));
  },
};

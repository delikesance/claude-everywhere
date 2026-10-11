import { beforeEach, describe, expect, it, vi } from "vitest";
import { findInPagePage, findInPageTool, MAX_HITS } from "./find-in-page";
import { runInTab } from "./run-in-tab";

vi.mock("./run-in-tab", () => ({ runInTab: vi.fn(async () => []) }));

const ctx = { tabId: 7, signal: new AbortController().signal };

describe("findInPagePage", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <h1>Guide</h1>
      <p>The Quick brown fox.</p>
      <script>var quick = 1;</script>
      <h2>Speed</h2>
      <p>Quick again, quick once more.</p>`;
  });

  it("matches case-insensitively and reports the enclosing section id", () => {
    const hits = findInPagePage("quick", 10, document);
    expect(hits.map((hit) => hit.sectionId)).toEqual(["s1", "s2", "s2"]);
    expect(hits[0]?.snippet).toContain("The Quick brown fox.");
  });

  it("ignores script text", () => {
    expect(findInPagePage("var quick", 10, document)).toEqual([]);
  });

  it("stops at maxResults", () => {
    expect(findInPagePage("quick", 2, document)).toHaveLength(2);
  });

  it("returns no hits when the text is absent", () => {
    expect(findInPagePage("zebra", 10, document)).toEqual([]);
  });

  it("treats regex metacharacters as plain text", () => {
    document.body.innerHTML = "<p>price (a.c*) [x]+</p>";
    expect(findInPagePage("(a.c*)", 10, document)).toHaveLength(1);
    expect(findInPagePage(".*", 10, document)).toEqual([]);
  });
});

describe("findInPageTool.run", () => {
  it("rejects an empty query before touching the page", async () => {
    await expect(findInPageTool.run({ query: "" }, ctx)).rejects.toThrow("query is required");
    expect(runInTab).not.toHaveBeenCalled();
  });

  it.each([
    [undefined, 10],
    [0, 1],
    [-4, 1],
    [999, MAX_HITS],
    [NaN, 10],
  ])("clamps maxResults %j to %j", async (maxResults, expected) => {
    await findInPageTool.run({ query: "q", maxResults }, ctx);
    expect(runInTab).toHaveBeenLastCalledWith(7, findInPagePage, ["q", expected]);
  });
});

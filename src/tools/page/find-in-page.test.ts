import { beforeEach, describe, expect, it } from "vitest";
import { findInPagePage } from "./find-in-page";

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
});

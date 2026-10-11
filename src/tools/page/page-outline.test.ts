import { beforeEach, describe, expect, it } from "vitest";
import { outlinePage } from "./page-outline";

describe("outlinePage", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <h1> Guide </h1>
      <p>Intro <a href="/a">one</a> <a>not a link</a></p>
      <h2>Install</h2>
      <table><tr><td>x</td></tr></table>
      <div><h4>Deep</h4></div>
      <h5>Ignored</h5>
      <h3>Usage</h3>`;
  });

  it("numbers h1-h4 headings in document order with stable ids", () => {
    expect(outlinePage(document).headings).toEqual([
      { id: "s1", level: 1, text: "Guide" },
      { id: "s2", level: 2, text: "Install" },
      { id: "s3", level: 4, text: "Deep" },
      { id: "s4", level: 3, text: "Usage" },
    ]);
  });

  it("counts tables, links with href and body characters", () => {
    const outline = outlinePage(document);
    expect(outline.tables).toBe(1);
    expect(outline.links).toBe(1);
    expect(outline.chars).toBe(document.body.textContent?.replace(/\s+/g, " ").trim().length);
  });
});

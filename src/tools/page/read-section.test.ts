import { beforeEach, describe, expect, it } from "vitest";
import { sectionHtmlInPage } from "./read-section";
import { htmlToMarkdown } from "../../extraction/markdown";

describe("sectionHtmlInPage", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <h1>Guide</h1>
      <p>Intro text.</p>
      <h2>Install</h2>
      <p>Run the installer.</p>
      <div><h3>Linux</h3><p>Use apt.</p></div>
      <h2>Usage</h2>
      <p>Open the menu.</p>`;
  });

  it("runs from the heading to the next heading of same or higher level", () => {
    const markdown = htmlToMarkdown(sectionHtmlInPage("s2", document) ?? "");
    expect(markdown).toContain("## Install");
    expect(markdown).toContain("Run the installer.");
    expect(markdown).toContain("Use apt.");
    expect(markdown).not.toContain("Open the menu.");
    expect(markdown).not.toContain("Intro text.");
  });

  it("runs to the end of the body for the last section", () => {
    const markdown = htmlToMarkdown(sectionHtmlInPage("s4", document) ?? "");
    expect(markdown).toContain("Open the menu.");
  });

  it("includes the subsections of a level-1 heading", () => {
    const markdown = htmlToMarkdown(sectionHtmlInPage("s1", document) ?? "");
    expect(markdown).toContain("Intro text.");
    expect(markdown).toContain("Use apt.");
  });

  it("returns null for an unknown id", () => {
    expect(sectionHtmlInPage("s9", document)).toBeNull();
  });
});

import { beforeEach, describe, expect, it } from "vitest";
import type { ExtractedPage } from "../shared/types";
import { readPage } from "./injected/read-page";
import { loadHtmlFixture, stubInnerText } from "./testing";

function readOk(): ExtractedPage {
  const result = readPage(document);
  if ("kind" in result) throw new Error(`unexpected error ${result.kind}`);
  return result;
}

describe("readPage", () => {
  beforeEach(stubInnerText);

  it("keeps the article body and drops the surrounding noise", () => {
    loadHtmlFixture("article.html", "/lire");
    const page = readOk();
    expect(page.markdown).toContain("Annoter un texte en marge");
    for (const noise of ["NAV_ACCUEIL", "AD_BANNER", "SIDEBAR_WIDGET", "FOOTER_LEGAL", "NOISE_SCRIPT"]) {
      expect(page.markdown).not.toContain(noise);
    }
    expect(page).toMatchObject({ sourceType: "page", usedFallback: false, lang: "fr", title: "Lire dans la marge" });
    expect(page.charCount).toBe(page.markdown.length);
  });

  it("converts headings, links, lists and code to Markdown", () => {
    loadHtmlFixture("article.html");
    const { markdown } = readOk();
    expect(markdown).toContain("## Trois gestes simples");
    expect(markdown).toContain("[la méthode complète](https://example.org/methode)");
    expect(markdown).toMatch(/^-\s+Souligner la phrase qui porte l'idée/m);
    expect(markdown).toContain("```");
    expect(markdown).toContain('const note = margin.add("question");');
  });

  it("does not mutate the live page", () => {
    loadHtmlFixture("article.html");
    const before = document.documentElement.outerHTML;
    readOk();
    expect(document.documentElement.outerHTML).toBe(before);
  });

  it("extracts a long page whole", () => {
    loadHtmlFixture("long.html");
    const page = readOk();
    expect(page.usedFallback).toBe(false);
    expect(page.markdown).toContain("Paragraph 1.");
    expect(page.markdown).toContain("Paragraph 120.");
    expect(page.charCount).toBeGreaterThan(20_000);
  });

  it("falls back to the body text when there is no article", () => {
    loadHtmlFixture("no-article.html");
    const page = readOk();
    expect(page.usedFallback).toBe(true);
    expect(page.markdown).toContain("Queue: 3 jobs");
    expect(page.markdown).not.toContain("HIDDEN_SCRIPT");
  });

  it("reports an empty page", () => {
    document.documentElement.innerHTML = "<head><title>Blank</title></head><body>   </body>";
    expect(readPage(document)).toMatchObject({ kind: "empty" });
  });

  it("re-reads url and title on every call", () => {
    loadHtmlFixture("article.html", "/premier");
    const first = readOk();
    document.title = "Second view";
    history.replaceState(null, "", "/second");
    const second = readOk();
    expect(first.url).toMatch(/\/premier$/);
    expect(second.url).toMatch(/\/second$/);
    expect(second.title).toBe("Second view");
  });
});

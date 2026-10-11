import { beforeEach, describe, expect, it } from "vitest";
import type { Library } from "./contract";
import { slugify } from "./slug";
import { conversation, draft, freshLibrary } from "./test-utils";

describe("slugify", () => {
  it("produces safe ascii filenames", () => {
    expect(slugify("Été à Paris : le guide / 2024 !")).toBe("ete-a-paris-le-guide-2024");
    expect(slugify("../../etc/passwd")).toBe("etc-passwd");
    expect(slugify("日本語")).toBe("artifact");
    expect(slugify("a".repeat(200))).toHaveLength(80);
  });
});

describe("exportMarkdown", () => {
  let library: Library;
  beforeEach(async () => {
    library = await freshLibrary();
  });

  it("writes escaped YAML front matter followed by the body", async () => {
    const saved = await library.saveArtifact(
      draft({
        title: 'Il a dit "oui": non\nvraiment',
        url: "https://example.com/a?x=1#frag",
        tags: ["a: b", "c'd", "- e"],
        markdown: "# Titre\n\nTexte",
      }),
    );
    const file = await library.exportMarkdown([saved.id], false);
    expect(file.mime).toBe("text/markdown");
    expect(file.filename).toBe("il-a-dit-oui-non-vraiment.md");
    const [fence, ...rest] = file.content.split("\n");
    expect(fence).toBe("---");
    expect(rest.slice(0, 6)).toEqual([
      'title: "Il a dit \\"oui\\": non\\nvraiment"',
      'url: "https://example.com/a?x=1#frag"',
      "source: page",
      `tags: ["a: b", "c'd", "- e"]`,
      `created: ${new Date(saved.createdAt).toISOString()}`,
      `updated: ${new Date(saved.updatedAt).toISOString()}`,
    ]);
    expect(rest.slice(6)).toEqual(["---", "", "# Titre", "", "Texte", ""]);
  });

  it("writes null for a missing url and escapes unicode line separators", async () => {
    const saved = await library.saveArtifact(draft({ url: null, sourceType: "note", title: "a b" }));
    const { content } = await library.exportMarkdown([saved.id], false);
    expect(content).toContain("url: null");
    expect(content).toContain('title: "a\\u2028b"');
  });

  it("bundles several artifacts in one file", async () => {
    const a = await library.saveArtifact(draft({ url: "https://e.com/a", title: "A", markdown: "corps A" }));
    const b = await library.saveArtifact(draft({ url: "https://e.com/b", title: "B", markdown: "corps B" }));
    const file = await library.exportMarkdown([a.id, b.id, "missing"], true);
    expect(file.filename).toBe("claude-everywhere-bundle.md");
    expect(file.content.match(/^title: /gm)).toHaveLength(2);
    expect(file.content.indexOf("corps A")).toBeLessThan(file.content.indexOf('title: "B"'));
    expect((await library.exportMarkdown([a.id], true)).filename).toBe("claude-everywhere-bundle.md");
  });
});

describe("exportJson", () => {
  it("contains the library data and nothing else", async () => {
    const library = await freshLibrary();
    const saved = await library.saveArtifact(draft());
    await library.saveConversation(conversation());
    const file = await library.exportJson();
    const dump = JSON.parse(file.content);
    expect(file.mime).toBe("application/json");
    expect(file.filename).toMatch(/^claude-everywhere-\d{4}-\d{2}-\d{2}\.json$/);
    expect(Object.keys(dump).sort()).toEqual(["artifacts", "conversations", "exportedAt", "schemaVersion", "versions"]);
    expect(dump.schemaVersion).toBe(1);
    expect(dump.artifacts[0].id).toBe(saved.id);
    expect(dump.versions).toHaveLength(1);
    expect(dump.conversations).toHaveLength(1);
  });
});

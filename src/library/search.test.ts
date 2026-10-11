import { beforeEach, describe, expect, it } from "vitest";
import type { Library } from "./contract";
import { draft, freshLibrary } from "./test-utils";

describe("search", () => {
  let library: Library;
  beforeEach(async () => {
    library = await freshLibrary();
  });

  it("ignores accents and case in both directions", async () => {
    await library.saveArtifact(draft({ title: "Éléphant", markdown: "La forêt brûle" }));
    expect(await library.search("ELEPHANT")).toHaveLength(1);
    expect(await library.search("foret")).toHaveLength(1);
    expect(await library.search("forêt")).toHaveLength(1);
    expect(await library.search("brule")).toHaveLength(1);
  });

  it("matches prefixes but not suffixes", async () => {
    await library.saveArtifact(draft({ markdown: "bibliothèque numérique" }));
    expect(await library.search("biblio")).toHaveLength(1);
    expect(await library.search("thèque")).toHaveLength(0);
  });

  it("requires every term to match", async () => {
    await library.saveArtifact(draft({ markdown: "chat noir" }));
    expect(await library.search("chat noir")).toHaveLength(1);
    expect(await library.search("chat blanc")).toHaveLength(0);
    expect(await library.search("   ")).toEqual([]);
  });

  it("ranks title above tag above text", async () => {
    const inText = await library.saveArtifact(draft({ url: "https://e.com/1", title: "x", markdown: "voile" }));
    const inTag = await library.saveArtifact(draft({ url: "https://e.com/2", title: "y", tags: ["voile"] }));
    const inTitle = await library.saveArtifact(draft({ url: "https://e.com/3", title: "Voile", markdown: "z" }));
    const hits = await library.search("voile");
    expect(hits.map((h) => h.artifact.id)).toEqual([inTitle.id, inTag.id, inText.id]);
    expect(hits.map((h) => h.snippets[0]?.field)).toEqual(["title", "tag", "text"]);
  });

  it("returns snippets around the hit with the original casing", async () => {
    await library.saveArtifact(draft({ markdown: "Une longue phrase avec un Éléphant au milieu du texte" }));
    const [hit] = await library.search("elephant");
    expect(hit?.snippets).toEqual([{ field: "text", before: "Une longue phrase avec un ", hit: "Éléphant", after: " au milieu du texte" }]);
  });

  it("bounds the snippet context and flattens newlines", async () => {
    const filler = "mot ".repeat(30);
    await library.saveArtifact(draft({ markdown: `${filler}\ncible\n${filler}` }));
    const [snippet] = (await library.search("cible"))[0]?.snippets ?? [];
    expect(snippet?.before.length).toBeLessThanOrEqual(40);
    expect(snippet?.after.length).toBeLessThanOrEqual(40);
    expect(`${snippet?.before}${snippet?.after}`).not.toContain("\n");
  });

  it("honours the limit", async () => {
    for (const n of [1, 2, 3]) await library.saveArtifact(draft({ url: `https://e.com/${n}`, markdown: "commun" }));
    expect(await library.search("commun", 2)).toHaveLength(2);
  });

  it("rebuilds the index lazily after changes", async () => {
    const saved = await library.saveArtifact(draft({ markdown: "ancien" }));
    expect(await library.search("ancien")).toHaveLength(1);
    await library.addVersion(saved.id, "nouveau");
    expect(await library.search("ancien")).toHaveLength(0);
    expect(await library.search("nouveau")).toHaveLength(1);
    await library.updateArtifact(saved.id, { tags: ["étiquette"] });
    expect((await library.search("etiquette"))[0]?.snippets[0]?.field).toBe("tag");
    await library.deleteArtifact(saved.id);
    expect(await library.search("nouveau")).toHaveLength(0);
  });
});

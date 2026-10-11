import { beforeEach, describe, expect, it } from "vitest";
import { MAX_VERSIONS } from "./artifacts";
import { artifactToContextItem } from "./index";
import type { Library } from "./contract";
import { draft, freshLibrary } from "./test-utils";

describe("artifacts", () => {
  let library: Library;
  beforeEach(async () => {
    library = await freshLibrary();
  });

  it("saves an artifact with its first version and excerpt", async () => {
    const saved = await library.saveArtifact(draft({ title: "  Mon titre ", tags: [" a ", "a", ""], markdown: "Un\n\ntexte" }));
    expect(saved).toMatchObject({ title: "Mon titre", tags: ["a"], excerpt: "Un texte", charCount: 9 });
    expect(await library.getArtifact(saved.id)).toMatchObject({ markdown: "Un\n\ntexte" });
    expect(await library.listVersions(saved.id)).toHaveLength(1);
  });

  it("returns the existing artifact for the same url and content", async () => {
    const first = await library.saveArtifact(draft());
    const second = await library.saveArtifact(draft({ title: "Autre titre" }));
    expect(second.id).toBe(first.id);
    expect(await library.listVersions(first.id)).toHaveLength(1);
    expect(await library.listArtifacts()).toHaveLength(1);
  });

  it("emits no change event when the saved content is unchanged", async () => {
    await library.saveArtifact(draft());
    await new Promise((resolve) => setTimeout(resolve, 20));
    let events = 0;
    library.onChange(() => events++);
    await library.saveArtifact(draft());
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(events).toBe(0);
  });

  it("keeps at most MAX_VERSIONS versions, dropping the oldest", async () => {
    const saved = await library.saveArtifact(draft({ markdown: "v0" }));
    for (let n = 1; n <= MAX_VERSIONS + 2; n++) await library.addVersion(saved.id, `v${n}`);
    const versions = await library.listVersions(saved.id);
    expect(versions).toHaveLength(MAX_VERSIONS);
    expect(versions[0]?.markdown).toBe(`v${MAX_VERSIONS + 2}`);
    expect(versions.some((version) => version.markdown === "v0")).toBe(false);
  });

  it("adds a version for the same url and new content", async () => {
    const first = await library.saveArtifact(draft());
    const second = await library.saveArtifact(draft({ markdown: "Nouveau corps" }));
    expect(second.id).toBe(first.id);
    expect(second.currentVersionId).not.toBe(first.currentVersionId);
    expect(second.updatedAt).toBeGreaterThan(first.updatedAt);
    expect(await library.listVersions(first.id)).toHaveLength(2);
  });

  it("never merges artifacts without a url", async () => {
    await library.saveArtifact(draft({ url: null, sourceType: "note" }));
    await library.saveArtifact(draft({ url: null, sourceType: "note" }));
    expect(await library.listArtifacts()).toHaveLength(2);
  });

  it("hashes content with SHA-256", async () => {
    const saved = await library.saveArtifact(draft({ markdown: "abc" }));
    const [version] = await library.listVersions(saved.id);
    expect(version?.contentHash).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  });

  it("lists versions newest first", async () => {
    const saved = await library.saveArtifact(draft());
    const added = await library.addVersion(saved.id, "v2");
    const versions = await library.listVersions(saved.id);
    expect(versions[0]?.id).toBe(added.id);
    expect(versions).toHaveLength(2);
  });

  it("restores a version by creating a new one without rewriting history", async () => {
    const saved = await library.saveArtifact(draft({ markdown: "v1" }));
    await library.addVersion(saved.id, "v2");
    const before = await library.listVersions(saved.id);
    const oldest = before[before.length - 1];
    const restored = await library.restoreVersion(saved.id, oldest?.id ?? "");
    const after = await library.listVersions(saved.id);
    expect(after).toHaveLength(3);
    expect(after.slice(1).map((v) => v.id)).toEqual(before.map((v) => v.id));
    expect(restored.currentVersionId).toBe(after[0]?.id);
    expect((await library.getArtifact(saved.id))?.markdown).toBe("v1");
  });

  it("rejects restoring a version of another artifact or an unknown artifact", async () => {
    const a = await library.saveArtifact(draft({ url: "https://example.com/a" }));
    const b = await library.saveArtifact(draft({ url: "https://example.com/b" }));
    await expect(library.restoreVersion(a.id, b.currentVersionId)).rejects.toThrow();
    await expect(library.addVersion("missing", "x")).rejects.toThrow();
    await expect(library.updateArtifact("missing", { title: "x" })).rejects.toThrow();
  });

  it("deletes the artifact and its versions together", async () => {
    const saved = await library.saveArtifact(draft());
    await library.addVersion(saved.id, "v2");
    const other = await library.saveArtifact(draft({ url: "https://example.com/b" }));
    await library.deleteArtifact(saved.id);
    expect(await library.getArtifact(saved.id)).toBeNull();
    expect(await library.listVersions(saved.id)).toEqual([]);
    expect(await library.listVersions(other.id)).toHaveLength(1);
  });

  it("updates title and tags and bumps updatedAt", async () => {
    const saved = await library.saveArtifact(draft());
    const updated = await library.updateArtifact(saved.id, { title: "Neuf", tags: ["x", "y"] });
    expect(updated).toMatchObject({ title: "Neuf", tags: ["x", "y"] });
    expect(updated.updatedAt).toBeGreaterThan(saved.updatedAt);
    expect((await library.updateArtifact(saved.id, {})).title).toBe("Neuf");
  });

  it("filters and sorts the list", async () => {
    const b = await library.saveArtifact(draft({ title: "banane", url: "https://e.com/b", tags: ["fruit"] }));
    const a = await library.saveArtifact(draft({ title: "Ananas", url: "https://e.com/a", tags: ["fruit"], sourceType: "pdf" }));
    const c = await library.saveArtifact(draft({ title: "école", url: null, sourceType: "note" }));
    const ids = async (q?: Parameters<Library["listArtifacts"]>[0]) => (await library.listArtifacts(q)).map((x) => x.id);
    expect(await ids()).toEqual([c.id, a.id, b.id]);
    expect(await ids({ sort: "created" })).toEqual([c.id, a.id, b.id]);
    expect(await ids({ sort: "title" })).toEqual([a.id, b.id, c.id]);
    expect(await ids({ tag: "fruit", sort: "title" })).toEqual([a.id, b.id]);
    expect(await ids({ sourceType: "note" })).toEqual([c.id]);
    await library.addVersion(b.id, "touched");
    expect((await ids())[0]).toBe(b.id);
  });

  it("builds a solid artifact context item", async () => {
    const saved = await library.saveArtifact(draft());
    const full = await library.getArtifact(saved.id);
    expect(artifactToContextItem(full!)).toMatchObject({
      kind: "artifact",
      included: true,
      status: "ready",
      artifactId: saved.id,
      text: "Corps du texte",
      title: "Titre",
    });
  });
});

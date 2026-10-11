import { beforeEach, describe, expect, it } from "vitest";
import type { Library } from "./contract";
import { ImportError } from "./import";
import { MAX_ARTIFACTS } from "./validate";
import { conversation, draft, freshLibrary } from "./test-utils";

const SCHEMA_ONLY = { schemaVersion: 1, artifacts: [], versions: [], conversations: [] };

async function exportedDump(library: Library) {
  return JSON.parse((await library.exportJson()).content);
}

describe("importJson", () => {
  let source: Library;
  let target: Library;
  beforeEach(async () => {
    source = await freshLibrary();
    target = await freshLibrary();
  });

  it("round-trips a full export into an empty library", async () => {
    const saved = await source.saveArtifact(draft({ tags: ["t"] }));
    await source.addVersion(saved.id, "v2");
    const chat = conversation();
    await source.saveConversation(chat);

    const report = await target.importJson((await source.exportJson()).content);

    expect(report).toEqual({ artifacts: 1, versions: 2, conversations: 1, skipped: 0 });
    expect(await target.getArtifact(saved.id)).toEqual(await source.getArtifact(saved.id));
    expect(await target.listVersions(saved.id)).toEqual(await source.listVersions(saved.id));
    expect(await target.getConversation(chat.id)).toEqual(chat);
    expect((await target.search("v2"))).toHaveLength(1);
  });

  it("keeps the newer updatedAt on conflicts", async () => {
    const saved = await source.saveArtifact(draft({ title: "Ancien" }));
    const oldDump = JSON.stringify(await exportedDump(source));
    await target.importJson(oldDump);
    await target.updateArtifact(saved.id, { title: "Local plus récent" });

    const report = await target.importJson(oldDump);
    expect(report).toMatchObject({ artifacts: 0, versions: 0 });
    expect((await target.getArtifact(saved.id))?.title).toBe("Local plus récent");

    await source.updateArtifact(saved.id, { title: "Distant plus récent encore" });
    await target.importJson((await source.exportJson()).content);
    expect((await target.getArtifact(saved.id))?.title).toBe("Distant plus récent encore");
  });

  it("merges conversations by updatedAt", async () => {
    const chat = conversation({ updatedAt: 10, title: "local" });
    await target.saveConversation(chat);
    const incoming = (title: string, updatedAt: number) =>
      JSON.stringify({ ...SCHEMA_ONLY, conversations: [{ ...chat, title, updatedAt }] });
    expect(await target.importJson(incoming("older", 5))).toMatchObject({ conversations: 0, skipped: 1 });
    expect(await target.importJson(incoming("newer", 20))).toMatchObject({ conversations: 1 });
    expect((await target.getConversation(chat.id))?.title).toBe("newer");
  });

  it("rejects non-JSON, wrong schema and wrong structure", async () => {
    const failure = async (text: string) => (await target.importJson(text).catch((e: unknown) => e)) as ImportError;
    expect(await failure("not json")).toMatchObject({ reason: "invalid_json" });
    expect(await failure("[]")).toMatchObject({ reason: "invalid_structure" });
    expect(await failure(JSON.stringify({ ...SCHEMA_ONLY, schemaVersion: 2 }))).toMatchObject({ reason: "unsupported_schema" });
    expect(await failure(JSON.stringify({ ...SCHEMA_ONLY, artifacts: "x" }))).toMatchObject({ reason: "invalid_structure" });
    expect(await failure(JSON.stringify({ schemaVersion: 1 }))).toMatchObject({ reason: "invalid_structure" });
    expect(await failure(JSON.stringify({ ...SCHEMA_ONLY, artifacts: new Array(MAX_ARTIFACTS + 1).fill(0) }))).toMatchObject({
      reason: "invalid_structure",
    });
  });

  it("skips malformed entries and imports the valid ones", async () => {
    const saved = await source.saveArtifact(draft());
    const dump = await exportedDump(source);
    const bad = [
      { ...dump.artifacts[0], id: "bad-type", createdAt: "yesterday" },
      { ...dump.artifacts[0], id: "bad-url", url: "javascript:alert(1)" },
      { ...dump.artifacts[0], id: "bad-source", sourceType: "other" },
      { ...dump.artifacts[0], id: "bad-tags", tags: [1] },
      { ...dump.artifacts[0], id: "orphan", currentVersionId: "missing" },
      "string",
      null,
    ];
    dump.artifacts.push(...bad);
    dump.versions.push({ ...dump.versions[0], id: "orphan-version", artifactId: "nobody" });
    dump.versions.push({ ...dump.versions[0], id: "bad-hash", contentHash: "zz" });
    dump.conversations.push({ ...conversation(), model: "gpt" });

    const report = await target.importJson(JSON.stringify(dump));

    expect(report).toEqual({ artifacts: 1, versions: 1, conversations: 0, skipped: 10 });
    expect((await target.listArtifacts()).map((a) => a.id)).toEqual([saved.id]);
  });

  it("ignores unknown fields instead of storing them", async () => {
    const saved = await source.saveArtifact(draft());
    const dump = await exportedDump(source);
    dump.artifacts[0].apiKey = "sk-secret";
    dump.settings = { apiKey: "sk-secret" };
    await target.importJson(JSON.stringify(dump));
    const stored = await target.exportJson();
    expect(stored.content).not.toContain("sk-secret");
    expect(await target.getArtifact(saved.id)).not.toHaveProperty("apiKey");
  });

  it("rejects a conversation containing an invalid message", async () => {
    const chat = conversation();
    const withBadMessage = { ...chat, messages: [{ ...chat.messages[0], role: "system" }] };
    const report = await target.importJson(JSON.stringify({ ...SCHEMA_ONLY, conversations: [withBadMessage] }));
    expect(report).toMatchObject({ conversations: 0, skipped: 1 });
  });
});

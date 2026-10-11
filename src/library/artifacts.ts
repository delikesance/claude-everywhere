import type { Artifact, ArtifactDraft, ArtifactVersion, ArtifactWithContent } from "../shared/types";
import type { ListQuery } from "./contract";
import { VERSION_STORES, type LibraryDb, type VersionTx } from "./db";
import { sha256Hex } from "./hash";

const EXCERPT_CHARS = 200;
export const MAX_VERSIONS = 20;

type ArtifactBase = Omit<Artifact, "updatedAt" | "currentVersionId" | "excerpt" | "charCount">;

export class NotFoundError extends Error {
  constructor(readonly id: string) {
    super(`not found: ${id}`);
  }
}

let lastStamp = 0;
function nextTimestamp(): number {
  lastStamp = Math.max(Date.now(), lastStamp + 1);
  return lastStamp;
}

function normalizeTags(tags: string[]): string[] {
  return [...new Set(tags.map((tag) => tag.trim()).filter(Boolean))];
}

function makeExcerpt(markdown: string): string {
  return markdown.replace(/\s+/g, " ").trim().slice(0, EXCERPT_CHARS);
}

async function writeVersion(
  tx: VersionTx,
  base: ArtifactBase,
  markdown: string,
  contentHash: string,
): Promise<{ artifact: Artifact; version: ArtifactVersion }> {
  const now = nextTimestamp();
  const version: ArtifactVersion = {
    id: crypto.randomUUID(),
    artifactId: base.id,
    createdAt: now,
    markdown,
    contentHash,
  };
  const artifact: Artifact = {
    ...base,
    updatedAt: now,
    currentVersionId: version.id,
    excerpt: makeExcerpt(markdown),
    charCount: markdown.length,
  };
  await tx.objectStore("versions").add(version);
  await tx.objectStore("artifacts").put(artifact);
  await pruneOldVersions(tx, base.id);
  return { artifact, version };
}

async function pruneOldVersions(tx: VersionTx, artifactId: string): Promise<void> {
  const store = tx.objectStore("versions");
  const versions = await store.index("by-artifact").getAll(artifactId);
  const oldest = versions.sort((a, b) => a.createdAt - b.createdAt).slice(0, Math.max(0, versions.length - MAX_VERSIONS));
  await Promise.all(oldest.map((version) => store.delete(version.id)));
}

export interface SaveResult {
  artifact: Artifact;
  changed: boolean;
}

export async function saveArtifact(db: LibraryDb, draft: ArtifactDraft): Promise<SaveResult> {
  const contentHash = await sha256Hex(draft.markdown);
  const tx = db.transaction(VERSION_STORES, "readwrite");
  const existing = draft.url === null ? undefined : await tx.objectStore("artifacts").index("by-url").get(draft.url);
  if (existing) {
    const current = await tx.objectStore("versions").get(existing.currentVersionId);
    if (current?.contentHash === contentHash) {
      await tx.done;
      return { artifact: existing, changed: false };
    }
    const written = await writeVersion(tx, existing, draft.markdown, contentHash);
    await tx.done;
    return { artifact: written.artifact, changed: true };
  }
  const base: ArtifactBase = {
    id: crypto.randomUUID(),
    title: draft.title.trim(),
    url: draft.url,
    sourceType: draft.sourceType,
    tags: normalizeTags(draft.tags),
    createdAt: nextTimestamp(),
  };
  const written = await writeVersion(tx, base, draft.markdown, contentHash);
  await tx.done;
  return { artifact: written.artifact, changed: true };
}

export async function addVersion(db: LibraryDb, id: string, markdown: string): Promise<ArtifactVersion> {
  const contentHash = await sha256Hex(markdown);
  const tx = db.transaction(VERSION_STORES, "readwrite");
  const artifact = await tx.objectStore("artifacts").get(id);
  if (!artifact) throw new NotFoundError(id);
  const { version } = await writeVersion(tx, artifact, markdown, contentHash);
  await tx.done;
  return version;
}

export async function restoreVersion(db: LibraryDb, id: string, versionId: string): Promise<Artifact> {
  const version = await db.get("versions", versionId);
  if (version?.artifactId !== id) throw new NotFoundError(versionId);
  const contentHash = version.contentHash;
  const tx = db.transaction(VERSION_STORES, "readwrite");
  const artifact = await tx.objectStore("artifacts").get(id);
  if (!artifact) throw new NotFoundError(id);
  const written = await writeVersion(tx, artifact, version.markdown, contentHash);
  await tx.done;
  return written.artifact;
}

export async function getArtifact(db: LibraryDb, id: string): Promise<ArtifactWithContent | null> {
  const tx = db.transaction(VERSION_STORES);
  const artifact = await tx.objectStore("artifacts").get(id);
  return artifact ? withContent(artifact, (versionId) => tx.objectStore("versions").get(versionId)) : null;
}

async function withContent(
  artifact: Artifact,
  getVersion: (versionId: string) => Promise<ArtifactVersion | undefined>,
): Promise<ArtifactWithContent> {
  const version = await getVersion(artifact.currentVersionId);
  return { ...artifact, markdown: version?.markdown ?? "" };
}

export async function updateArtifact(
  db: LibraryDb,
  id: string,
  patch: { title?: string; tags?: string[] },
): Promise<Artifact> {
  const tx = db.transaction("artifacts", "readwrite");
  const artifact = await tx.store.get(id);
  if (!artifact) throw new NotFoundError(id);
  const updated: Artifact = {
    ...artifact,
    title: patch.title === undefined ? artifact.title : patch.title.trim(),
    tags: patch.tags === undefined ? artifact.tags : normalizeTags(patch.tags),
    updatedAt: nextTimestamp(),
  };
  await tx.store.put(updated);
  await tx.done;
  return updated;
}

export async function listVersions(db: LibraryDb, id: string): Promise<ArtifactVersion[]> {
  const versions = await db.getAllFromIndex("versions", "by-artifact", id);
  return versions.sort((a, b) => b.createdAt - a.createdAt);
}

export async function deleteArtifact(db: LibraryDb, id: string): Promise<void> {
  const tx = db.transaction(VERSION_STORES, "readwrite");
  const versionKeys = await tx.objectStore("versions").index("by-artifact").getAllKeys(id);
  await Promise.all(versionKeys.map((key) => tx.objectStore("versions").delete(key)));
  await tx.objectStore("artifacts").delete(id);
  await tx.done;
}

const SORTERS: Record<NonNullable<ListQuery["sort"]>, (a: Artifact, b: Artifact) => number> = {
  updated: (a, b) => b.updatedAt - a.updatedAt,
  created: (a, b) => b.createdAt - a.createdAt,
  title: (a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: "base" }),
};

export async function listArtifacts(db: LibraryDb, q: ListQuery = {}): Promise<Artifact[]> {
  const all = await db.getAll("artifacts");
  return all
    .filter((a) => (q.tag === undefined || a.tags.includes(q.tag)) && (q.sourceType === undefined || a.sourceType === q.sourceType))
    .sort(SORTERS[q.sort ?? "updated"]);
}

export async function loadCurrentContents(db: LibraryDb): Promise<ArtifactWithContent[]> {
  const tx = db.transaction(VERSION_STORES);
  const artifacts = await tx.objectStore("artifacts").getAll();
  return Promise.all(
    artifacts.map((artifact) => withContent(artifact, (versionId) => tx.objectStore("versions").get(versionId))),
  );
}

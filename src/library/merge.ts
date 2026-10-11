import type { ImportReport } from "./contract";
import type { LibraryDb } from "./db";
import type { ParsedImport } from "./import";

export async function mergeImport(db: LibraryDb, data: ParsedImport): Promise<ImportReport> {
  const tx = db.transaction(["artifacts", "versions", "conversations"], "readwrite");
  const artifacts = tx.objectStore("artifacts");
  const versions = tx.objectStore("versions");
  const conversations = tx.objectStore("conversations");
  const importedArtifactIds = new Set(data.artifacts.map((a) => a.id));
  const report: ImportReport = { artifacts: 0, versions: 0, conversations: 0, skipped: data.skipped };

  for (const version of data.versions) {
    const hasOwner = importedArtifactIds.has(version.artifactId) || (await artifacts.get(version.artifactId));
    if (!hasOwner || (await versions.get(version.id))) {
      report.skipped++;
      continue;
    }
    await versions.add(version);
    report.versions++;
  }
  for (const artifact of data.artifacts) {
    const existing = await artifacts.get(artifact.id);
    const current = await versions.get(artifact.currentVersionId);
    const isNewer = !existing || artifact.updatedAt > existing.updatedAt;
    if (!isNewer || current?.artifactId !== artifact.id) {
      report.skipped++;
      continue;
    }
    await artifacts.put(artifact);
    report.artifacts++;
  }
  for (const conversation of data.conversations) {
    const existing = await conversations.get(conversation.id);
    if (existing && existing.updatedAt >= conversation.updatedAt) {
      report.skipped++;
      continue;
    }
    await conversations.put(conversation);
    report.conversations++;
  }
  await tx.done;
  return report;
}

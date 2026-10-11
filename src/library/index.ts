import type { ArtifactWithContent, ContextItem } from "../shared/types";
import type { Library } from "./contract";
import { openLibraryDb } from "./db";
import { createLibrary } from "./library";

export type {
  ExportFile,
  ImportReport,
  Library,
  ListQuery,
  SearchHit,
} from "./contract";
export { ImportError } from "./import";

let instance: Promise<Library> | null = null;

export function openLibrary(): Promise<Library> {
  instance ??= openLibraryDb()
    .then(createLibrary)
    .catch((error: unknown) => {
      instance = null;
      throw error;
    });
  return instance;
}

export function artifactToContextItem(a: ArtifactWithContent): ContextItem {
  return {
    id: `artifact-${a.id}`,
    kind: "artifact",
    title: a.title,
    url: a.url,
    text: a.markdown,
    included: true,
    status: "ready",
    artifactId: a.id,
  };
}

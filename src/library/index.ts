import type {
  Artifact,
  ArtifactDraft,
  ArtifactVersion,
  ArtifactWithContent,
  ContextItem,
  Conversation,
  SourceType,
} from "../shared/types";

export interface ListQuery {
  tag?: string;
  sourceType?: SourceType;
  sort?: "updated" | "created" | "title";
}

export interface SearchHit {
  artifact: Artifact;
  score: number;
  snippets: { field: "title" | "tag" | "text"; before: string; hit: string; after: string }[];
}

export interface ExportFile {
  filename: string;
  mime: string;
  content: string;
}

export interface ImportReport {
  artifacts: number;
  versions: number;
  conversations: number;
  skipped: number;
}

export interface Library {
  saveArtifact(draft: ArtifactDraft): Promise<Artifact>;
  getArtifact(id: string): Promise<ArtifactWithContent | null>;
  listArtifacts(q?: ListQuery): Promise<Artifact[]>;
  updateArtifact(id: string, patch: { title?: string; tags?: string[] }): Promise<Artifact>;
  addVersion(id: string, markdown: string): Promise<ArtifactVersion>;
  listVersions(id: string): Promise<ArtifactVersion[]>;
  restoreVersion(id: string, versionId: string): Promise<Artifact>;
  deleteArtifact(id: string): Promise<void>;
  search(query: string, limit?: number): Promise<SearchHit[]>;
  saveConversation(c: Conversation): Promise<void>;
  getConversation(id: string): Promise<Conversation | null>;
  listConversations(): Promise<Omit<Conversation, "messages" | "items">[]>;
  deleteConversation(id: string): Promise<void>;
  exportMarkdown(ids: string[], bundle: boolean): Promise<ExportFile>;
  exportJson(): Promise<ExportFile>;
  importJson(text: string): Promise<ImportReport>;
  clearAll(): Promise<void>;
  onChange(cb: () => void): () => void;
}

export function openLibrary(): Promise<Library> {
  throw new Error("not implemented");
}

export function artifactToContextItem(_a: ArtifactWithContent): ContextItem {
  throw new Error("not implemented");
}

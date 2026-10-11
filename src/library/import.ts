import { SCHEMA_VERSION } from "../shared/constants";
import type { Artifact, ArtifactVersion, Conversation, SourceType } from "../shared/types";
import { parseConversation } from "./parse-conversation";
import {
  MAX_ARTIFACTS,
  MAX_CONVERSATIONS,
  MAX_EXCERPT_CHARS,
  MAX_IMPORT_CHARS,
  MAX_TAGS,
  MAX_TAG_CHARS,
  MAX_TEXT_CHARS,
  MAX_TITLE_CHARS,
  MAX_VERSIONS,
  isBoundedArray,
  isCount,
  isHash,
  isId,
  isOneOf,
  isRecord,
  isText,
  isWebUrl,
} from "./validate";

const SOURCE_TYPES: readonly SourceType[] = ["page", "selection", "pdf", "note"];

export type ImportFailure = "too_large" | "invalid_json" | "unsupported_schema" | "invalid_structure";

export class ImportError extends Error {
  constructor(readonly reason: ImportFailure) {
    super(reason);
  }
}

export interface ParsedImport {
  artifacts: Artifact[];
  versions: ArtifactVersion[];
  conversations: Conversation[];
  skipped: number;
}

function parseTags(raw: unknown): string[] | null {
  if (!isBoundedArray(raw, MAX_TAGS)) return null;
  return raw.every((tag) => isText(tag, MAX_TAG_CHARS)) ? (raw as string[]) : null;
}

function parseArtifact(raw: unknown): Artifact | null {
  if (!isRecord(raw) || !isId(raw.id) || !isText(raw.title, MAX_TITLE_CHARS)) return null;
  if (raw.url !== null && !isWebUrl(raw.url)) return null;
  if (!isOneOf(SOURCE_TYPES, raw.sourceType) || !isId(raw.currentVersionId)) return null;
  if (!isCount(raw.createdAt) || !isCount(raw.updatedAt) || !isCount(raw.charCount)) return null;
  if (!isText(raw.excerpt, MAX_EXCERPT_CHARS)) return null;
  const tags = parseTags(raw.tags);
  if (!tags) return null;
  return {
    id: raw.id,
    title: raw.title,
    url: raw.url,
    sourceType: raw.sourceType,
    tags,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    currentVersionId: raw.currentVersionId,
    excerpt: raw.excerpt,
    charCount: raw.charCount,
  };
}

function parseVersion(raw: unknown): ArtifactVersion | null {
  if (!isRecord(raw) || !isId(raw.id) || !isId(raw.artifactId) || !isCount(raw.createdAt)) return null;
  if (!isText(raw.markdown, MAX_TEXT_CHARS) || !isHash(raw.contentHash)) return null;
  return {
    id: raw.id,
    artifactId: raw.artifactId,
    createdAt: raw.createdAt,
    markdown: raw.markdown,
    contentHash: raw.contentHash,
  };
}

function parseEntries<T>(raw: unknown, max: number, parseOne: (entry: unknown) => T | null) {
  if (!isBoundedArray(raw, max)) throw new ImportError("invalid_structure");
  const valid = raw.map(parseOne).filter((entry): entry is T => entry !== null);
  return { valid, skipped: raw.length - valid.length };
}

function parseJson(text: string): unknown {
  if (text.length > MAX_IMPORT_CHARS) throw new ImportError("too_large");
  try {
    return JSON.parse(text);
  } catch {
    throw new ImportError("invalid_json");
  }
}

export function parseImport(text: string): ParsedImport {
  const raw = parseJson(text);
  if (!isRecord(raw)) throw new ImportError("invalid_structure");
  if (raw.schemaVersion !== SCHEMA_VERSION) throw new ImportError("unsupported_schema");
  const artifacts = parseEntries(raw.artifacts, MAX_ARTIFACTS, parseArtifact);
  const versions = parseEntries(raw.versions, MAX_VERSIONS, parseVersion);
  const conversations = parseEntries(raw.conversations, MAX_CONVERSATIONS, parseConversation);
  return {
    artifacts: artifacts.valid,
    versions: versions.valid,
    conversations: conversations.valid,
    skipped: artifacts.skipped + versions.skipped + conversations.skipped,
  };
}

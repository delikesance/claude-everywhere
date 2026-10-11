import { SCHEMA_VERSION } from "../shared/constants";
import type { Artifact, ArtifactVersion, ArtifactWithContent, Conversation } from "../shared/types";
import type { ExportFile } from "./contract";
import { slugify } from "./slug";

const FRONT_MATTER_FENCE = "---";
const BUNDLE_FILENAME = "claude-everywhere-bundle.md";
const MARKDOWN_MIME = "text/markdown";
const JSON_MIME = "application/json";
const UNSAFE_YAML_CHARS = new RegExp("[\\u007f-\\u009f\\u2028\\u2029]", "g");

export interface LibraryDump {
  schemaVersion: typeof SCHEMA_VERSION;
  exportedAt: string;
  artifacts: Artifact[];
  versions: ArtifactVersion[];
  conversations: Conversation[];
}

// A JSON string literal is a valid YAML double-quoted scalar once line-break and control characters are escaped.
function yamlString(value: string): string {
  return JSON.stringify(value).replace(UNSAFE_YAML_CHARS, (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, "0")}`);
}

function toDocument(a: ArtifactWithContent): string {
  return [
    FRONT_MATTER_FENCE,
    `title: ${yamlString(a.title)}`,
    `url: ${a.url === null ? "null" : yamlString(a.url)}`,
    `source: ${a.sourceType}`,
    `tags: [${a.tags.map(yamlString).join(", ")}]`,
    `created: ${new Date(a.createdAt).toISOString()}`,
    `updated: ${new Date(a.updatedAt).toISOString()}`,
    FRONT_MATTER_FENCE,
    "",
    a.markdown,
    "",
  ].join("\n");
}

export function buildMarkdownExport(artifacts: ArtifactWithContent[], bundle: boolean): ExportFile {
  const [first] = artifacts;
  const single = !bundle && artifacts.length === 1 && first;
  return {
    filename: single ? `${slugify(single.title)}.md` : BUNDLE_FILENAME,
    mime: MARKDOWN_MIME,
    content: artifacts.map(toDocument).join("\n"),
  };
}

export function buildJsonExport(data: Omit<LibraryDump, "schemaVersion" | "exportedAt">, now: Date): ExportFile {
  const dump: LibraryDump = { schemaVersion: SCHEMA_VERSION, exportedAt: now.toISOString(), ...data };
  return {
    filename: `claude-everywhere-${now.toISOString().slice(0, 10)}.json`,
    mime: JSON_MIME,
    content: JSON.stringify(dump, null, 2),
  };
}

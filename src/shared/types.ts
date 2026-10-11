import type { Backend, ModelId } from "./constants";

export { AppException } from "./errors";

export type UiLocale = "fr" | "en";
export type Theme = "system" | "light" | "dark";

export interface Settings {
  schemaVersion: 1;
  backend: Backend;
  apiKey: string | null;
  defaultModel: ModelId;
  maxTokens: number;
  uiLocale: UiLocale | "auto";
  answerLanguage: "auto" | UiLocale;
  theme: Theme;
  overlayAllSites: boolean;
  sidebarReadsActiveTab: boolean;
}

export type SourceType = "page" | "selection" | "pdf" | "note";

export interface Artifact {
  id: string;
  title: string;
  url: string | null;
  sourceType: SourceType;
  tags: string[];
  createdAt: number;
  updatedAt: number;
  currentVersionId: string;
  excerpt: string;
  charCount: number;
}

export interface ArtifactVersion {
  id: string;
  artifactId: string;
  createdAt: number;
  markdown: string;
  contentHash: string;
}

export interface ArtifactDraft {
  title: string;
  url: string | null;
  sourceType: SourceType;
  tags: string[];
  markdown: string;
}

export type ArtifactWithContent = Artifact & { markdown: string };

export type ChatRole = "user" | "assistant";
export type StopReason = "end_turn" | "max_tokens" | "refusal" | "stop_sequence" | "other";

export interface ChatMessage {
  id: string;
  role: ChatRole;
  text: string;
  createdAt: number;
  model?: ModelId;
  stopReason?: StopReason | "interrupted";
  bordereau?: Bordereau;
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  model: ModelId;
  items: ContextItem[];
  messages: ChatMessage[];
}

export type ContextKind = "page" | "selection" | "pdf" | "artifact" | "note";

export interface ContextItem {
  id: string;
  kind: ContextKind;
  title: string;
  url: string | null;
  text: string;
  included: boolean;
  status: "ready" | "loading" | "unreadable";
  artifactId?: string;
}

export interface BordereauLine {
  itemId: string;
  title: string;
  sentChars: number;
  totalChars: number;
}

export interface Bordereau {
  lines: BordereauLine[];
  sentChars: number;
  totalChars: number;
  budgetChars: number;
  truncated: boolean;
  estimatedTokens: number;
  model: ModelId;
}

export interface ExtractedPage {
  url: string;
  title: string;
  siteName: string | null;
  lang: string | null;
  sourceType: "page" | "selection" | "pdf" | "manual";
  markdown: string;
  charCount: number;
  capturedAt: number;
  usedFallback: boolean;
}

export type ExtractionErrorKind = "restricted" | "unreadable" | "empty" | "permission" | "pdf_failed";

export interface ExtractionErrorData {
  kind: ExtractionErrorKind;
  message: string;
  origin?: string;
}

export type ApiError =
  | { kind: "no_key" }
  | { kind: "auth" }
  | { kind: "rate_limit"; retryAfterSec: number | null }
  | { kind: "overloaded" }
  | { kind: "network" }
  | { kind: "aborted" }
  | { kind: "bad_request"; message: string }
  | { kind: "unknown"; status: number | null };

export type AppError = ApiError | ExtractionErrorData;

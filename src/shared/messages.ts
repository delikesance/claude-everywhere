import type { ModelId } from "./constants";
import type {
  Artifact,
  ArtifactDraft,
  ApiError,
  AppError,
  Bordereau,
  ChatMessage,
  ContextItem,
  ExtractedPage,
  StopReason,
  UiLocale,
} from "./types";

export type CaptureMode = "page" | "selection";
export type Result<T> = { ok: true; value: T } | { ok: false; error: AppError };

export interface RequestMap {
  "key/validate": { req: { apiKey: string }; res: { valid: true } };
  "native/ping": { req: Record<string, never>; res: { available: boolean } };
  "capture/run": { req: { mode: CaptureMode; tabId?: number; handoff: boolean }; res: ExtractedPage };
  "capture/takePending": { req: Record<string, never>; res: ExtractedPage | null };
  "pdf/extract": { req: { url: string }; res: ExtractedPage };
  "artifact/save": { req: { draft: ArtifactDraft }; res: Artifact };
  "overlay/config": {
    req: Record<string, never>;
    res: { defaultModel: ModelId; uiLocale: UiLocale | "auto"; answerLanguage: "auto" | UiLocale; hasKey: boolean };
  };
}

export type Request = { [K in keyof RequestMap]: { type: K } & RequestMap[K]["req"] }[keyof RequestMap];
export type ResponseOf<K extends keyof RequestMap> = Result<RequestMap[K]["res"]>;

export type TabMessage = { type: "overlay/show" };

export interface ChatStart {
  type: "start";
  requestId: string;
  model: ModelId;
  items: ContextItem[];
  history: ChatMessage[];
  userText: string;
  answerLanguage: "auto" | UiLocale;
  maxTokens?: number;
  tabId?: number;
}

export type ChatClientMsg = ChatStart | { type: "cancel"; requestId: string };

export type ChatServerMsg =
  | { type: "delta"; requestId: string; text: string }
  | {
      type: "done";
      requestId: string;
      stopReason: StopReason;
      usage: { inputTokens: number; outputTokens: number };
      bordereau: Bordereau;
    }
  | { type: "tool"; requestId: string; name: string; input: Record<string, unknown>; resultChars: number }
  | { type: "error"; requestId: string; error: ApiError };

export interface ChatConnection {
  start(msg: Omit<ChatStart, "type">): void;
  cancel(requestId: string): void;
  onMessage(cb: (m: ChatServerMsg) => void): void;
  onDisconnect(cb: () => void): void;
  close(): void;
}

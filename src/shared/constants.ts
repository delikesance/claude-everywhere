export const MODEL_IDS = [
  "claude-haiku-5-5",
  "claude-sonnet-5-5",
  "claude-opus-5-5",
] as const;
export type ModelId = (typeof MODEL_IDS)[number];
export const DEFAULT_MODEL: ModelId = "claude-sonnet-5-5";
export const BACKENDS = ["claude-code", "api-key"] as const;
export type Backend = (typeof BACKENDS)[number];
export const DEFAULT_BACKEND: Backend = "api-key";
export const NATIVE_HOST_NAME = "claude_everywhere";
export const DEFAULT_MAX_TOKENS = 4096;
export const MAX_OUTPUT_TOKENS = 64_000;
export const CHARS_PER_TOKEN = 4;

// The three models have a context window of at least 200k tokens. 450_000 chars is 150k tokens at a
// conservative 3 chars/token (code, accents and non-Latin text tokenize worse than the 4 chars/token estimate),
// which leaves 50k tokens of margin for the system prompt, history and output.
const CONSERVATIVE_INPUT_BUDGET_CHARS = 450_000;
export const INPUT_BUDGET_CHARS: Record<ModelId, number> = {
  "claude-haiku-5-5": CONSERVATIVE_INPUT_BUDGET_CHARS,
  "claude-sonnet-5-5": CONSERVATIVE_INPUT_BUDGET_CHARS,
  "claude-opus-5-5": CONSERVATIVE_INPUT_BUDGET_CHARS,
};

export const CHAT_PORT_NAME = "chat";
export const STORAGE_KEYS = {
  settings: "settings",
  pendingCapture: "pendingCapture",
  pendingAttach: "pendingAttach",
} as const;
export const DB_NAME = "claude-everywhere";
export const DB_VERSION = 1;
export const LIBRARY_CHANNEL = "library-changed";
export const SCHEMA_VERSION = 1;
export const API_ORIGIN = "https://api.anthropic.com/*";

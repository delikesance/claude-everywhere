export const MODEL_IDS = ["claude-haiku-5-5", "claude-sonnet-5-5", "claude-opus-5-5"] as const;
export type ModelId = (typeof MODEL_IDS)[number];
export const DEFAULT_MODEL: ModelId = "claude-sonnet-5-5";
export const DEFAULT_MAX_TOKENS = 4096;
export const CHARS_PER_TOKEN = 4;

// Provisional: 600_000 chars (~150k tokens) for every model until verified against the provider docs.
const PROVISIONAL_INPUT_BUDGET_CHARS = 600_000;
export const INPUT_BUDGET_CHARS: Record<ModelId, number> = {
  "claude-haiku-5-5": PROVISIONAL_INPUT_BUDGET_CHARS,
  "claude-sonnet-5-5": PROVISIONAL_INPUT_BUDGET_CHARS,
  "claude-opus-5-5": PROVISIONAL_INPUT_BUDGET_CHARS,
};

export const CHAT_PORT_NAME = "chat";
export const STORAGE_KEYS = { settings: "settings", pendingCapture: "pendingCapture" } as const;
export const DB_NAME = "claude-everywhere";
export const DB_VERSION = 1;
export const LIBRARY_CHANNEL = "library-changed";
export const SCHEMA_VERSION = 1;
export const API_ORIGIN = "https://api.anthropic.com/*";

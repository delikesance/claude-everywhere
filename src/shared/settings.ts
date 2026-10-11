import { BACKENDS, DEFAULT_BACKEND, DEFAULT_MAX_TOKENS, DEFAULT_MODEL, MAX_OUTPUT_TOKENS, MODEL_IDS, SCHEMA_VERSION, STORAGE_KEYS } from "./constants";
import type { Backend, ModelId } from "./constants";
import type { Settings, Theme, UiLocale } from "./types";

const MIN_MAX_TOKENS = 1;

export const DEFAULT_SETTINGS: Settings = {
  schemaVersion: SCHEMA_VERSION,
  backend: DEFAULT_BACKEND,
  apiKey: null,
  defaultModel: DEFAULT_MODEL,
  maxTokens: DEFAULT_MAX_TOKENS,
  uiLocale: "auto",
  answerLanguage: "auto",
  theme: "system",
  overlayAllSites: false,
  sidebarReadsActiveTab: false,
};

const oneOf = <T extends string>(allowed: readonly T[], value: unknown, fallback: T): T =>
  allowed.includes(value as T) ? (value as T) : fallback;

const bool = (value: unknown, fallback: boolean): boolean => (typeof value === "boolean" ? value : fallback);

function validMaxTokens(value: unknown): number {
  if (typeof value !== "number" || !Number.isInteger(value)) return DEFAULT_MAX_TOKENS;
  return Math.min(Math.max(value, MIN_MAX_TOKENS), MAX_OUTPUT_TOKENS);
}

function validApiKey(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

export function normalizeSettings(raw: unknown): Settings {
  const stored = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
  const d = DEFAULT_SETTINGS;
  return {
    schemaVersion: SCHEMA_VERSION,
    backend: oneOf<Backend>(BACKENDS, stored["backend"], d.backend),
    apiKey: validApiKey(stored["apiKey"]),
    defaultModel: oneOf<ModelId>(MODEL_IDS, stored["defaultModel"], d.defaultModel),
    maxTokens: validMaxTokens(stored["maxTokens"]),
    uiLocale: oneOf<UiLocale | "auto">(["auto", "fr", "en"], stored["uiLocale"], d.uiLocale),
    answerLanguage: oneOf<"auto" | UiLocale>(["auto", "fr", "en"], stored["answerLanguage"], d.answerLanguage),
    theme: oneOf<Theme>(["system", "light", "dark"], stored["theme"], d.theme),
    overlayAllSites: bool(stored["overlayAllSites"], d.overlayAllSites),
    sidebarReadsActiveTab: bool(stored["sidebarReadsActiveTab"], d.sidebarReadsActiveTab),
  };
}

export async function getSettings(): Promise<Settings> {
  const stored = await browser.storage.local.get(STORAGE_KEYS.settings);
  return normalizeSettings(stored[STORAGE_KEYS.settings]);
}

export async function patchSettings(patch: Partial<Settings>): Promise<Settings> {
  const next = normalizeSettings({ ...(await getSettings()), ...patch });
  await browser.storage.local.set({ [STORAGE_KEYS.settings]: next });
  return next;
}

export function redactSettings(settings: Settings): Omit<Settings, "apiKey"> & { apiKey: "***" | null } {
  return { ...settings, apiKey: settings.apiKey === null ? null : "***" };
}

export const MAX_IMPORT_CHARS = 100_000_000;
export const MAX_ARTIFACTS = 10_000;
export const MAX_VERSIONS = 100_000;
export const MAX_CONVERSATIONS = 10_000;
export const MAX_MESSAGES_PER_CONVERSATION = 5_000;
export const MAX_ITEMS_PER_CONVERSATION = 100;
export const MAX_LINES_PER_BORDEREAU = 100;
export const MAX_TOOL_CALLS_PER_MESSAGE = 100;
export const MAX_TAGS = 50;
export const MAX_ID_CHARS = 100;
export const MAX_TITLE_CHARS = 500;
export const MAX_TAG_CHARS = 100;
export const MAX_URL_CHARS = 4_000;
export const MAX_EXCERPT_CHARS = 1_000;
export const MAX_TEXT_CHARS = 5_000_000;

const HASH_PATTERN = /^[0-9a-f]{64}$/;
const WEB_PROTOCOLS = ["http:", "https:"];

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isText(value: unknown, max: number): value is string {
  return typeof value === "string" && value.length <= max;
}

export function isId(value: unknown): value is string {
  return isText(value, MAX_ID_CHARS) && value.length > 0;
}

export function isCount(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

export function isOneOf<T extends string>(allowed: readonly T[], value: unknown): value is T {
  return allowed.some((candidate) => candidate === value);
}

export function isHash(value: unknown): value is string {
  return typeof value === "string" && HASH_PATTERN.test(value);
}

export function isWebUrl(value: unknown): value is string {
  if (!isText(value, MAX_URL_CHARS)) return false;
  try {
    return WEB_PROTOCOLS.includes(new URL(value).protocol);
  } catch {
    return false;
  }
}

export function isBoundedArray(value: unknown, max: number): value is unknown[] {
  return Array.isArray(value) && value.length <= max;
}

import { DEFAULT_MAX_TOKENS, MAX_OUTPUT_TOKENS, MODEL_IDS } from "../shared/constants";
import type { ChatStart } from "../shared/messages";

type Raw = Record<string, unknown>;

const isRecord = (value: unknown): value is Raw => typeof value === "object" && value !== null;
const isString = (value: unknown): value is string => typeof value === "string";
const isArrayOf = (value: unknown, check: (entry: Raw) => boolean): boolean =>
  Array.isArray(value) && value.every((entry) => isRecord(entry) && check(entry));

const isItem = (item: Raw): boolean =>
  isString(item["id"]) && isString(item["title"]) && isString(item["text"]) && typeof item["included"] === "boolean";
const isHistoryMessage = (m: Raw): boolean => (m["role"] === "user" || m["role"] === "assistant") && isString(m["text"]);
const isOptionalTabId = (value: unknown): boolean => value === undefined || (Number.isInteger(value) && (value as number) > 0);

function clampMaxTokens(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return DEFAULT_MAX_TOKENS;
  return Math.min(Math.max(Math.floor(value), 1), MAX_OUTPUT_TOKENS);
}

export function parseChatStart(raw: Raw): ChatStart | null {
  const { model, items, history, userText, answerLanguage } = raw;
  const valid =
    MODEL_IDS.some((id) => id === model) &&
    isArrayOf(items, isItem) &&
    isArrayOf(history, isHistoryMessage) &&
    isString(userText) &&
    (answerLanguage === "auto" || answerLanguage === "fr" || answerLanguage === "en") &&
    isOptionalTabId(raw["tabId"]);
  return valid ? ({ ...raw, maxTokens: clampMaxTokens(raw["maxTokens"]) } as unknown as ChatStart) : null;
}

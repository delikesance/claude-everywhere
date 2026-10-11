import { MODEL_IDS } from "../shared/constants";
import type { Bordereau, BordereauLine, ChatMessage, ContextItem, Conversation } from "../shared/types";

type ToolCall = NonNullable<ChatMessage["toolCalls"]>[number];
import {
  MAX_ITEMS_PER_CONVERSATION,
  MAX_LINES_PER_BORDEREAU,
  MAX_MESSAGES_PER_CONVERSATION,
  MAX_TEXT_CHARS,
  MAX_TITLE_CHARS,
  MAX_TOOL_CALLS_PER_MESSAGE,
  MAX_URL_CHARS,
  isBoundedArray,
  isCount,
  isId,
  isOneOf,
  isRecord,
  isText,
} from "./validate";

const CONTEXT_KINDS = ["page", "selection", "pdf", "artifact", "note"] as const;
const ITEM_STATUSES = ["ready", "loading", "unreadable"] as const;
const ROLES = ["user", "assistant"] as const;
const STOP_REASONS = ["end_turn", "max_tokens", "refusal", "stop_sequence", "other", "interrupted"] as const;

function parseList<T>(raw: unknown, max: number, parseOne: (entry: unknown) => T | null): T[] | null {
  if (!isBoundedArray(raw, max)) return null;
  const parsed = raw.map(parseOne);
  return parsed.every((entry) => entry !== null) ? (parsed as T[]) : null;
}

function parseLine(raw: unknown): BordereauLine | null {
  if (!isRecord(raw) || !isId(raw.itemId) || !isText(raw.title, MAX_TITLE_CHARS)) return null;
  if (!isCount(raw.sentChars) || !isCount(raw.totalChars)) return null;
  return { itemId: raw.itemId, title: raw.title, sentChars: raw.sentChars, totalChars: raw.totalChars };
}

function parseToolCall(raw: unknown): ToolCall | null {
  if (!isRecord(raw) || !isText(raw.name, MAX_TITLE_CHARS) || !isText(raw.inputSummary, MAX_TITLE_CHARS)) return null;
  if (!isCount(raw.resultChars)) return null;
  return { name: raw.name, inputSummary: raw.inputSummary, resultChars: raw.resultChars };
}

function parseBordereau(raw: unknown): Bordereau | null {
  if (!isRecord(raw) || !isOneOf(MODEL_IDS, raw.model) || typeof raw.truncated !== "boolean") return null;
  if (!isCount(raw.sentChars) || !isCount(raw.totalChars) || !isCount(raw.budgetChars) || !isCount(raw.estimatedTokens)) return null;
  const lines = parseList(raw.lines, MAX_LINES_PER_BORDEREAU, parseLine);
  if (!lines) return null;
  return {
    lines,
    sentChars: raw.sentChars,
    totalChars: raw.totalChars,
    budgetChars: raw.budgetChars,
    truncated: raw.truncated,
    estimatedTokens: raw.estimatedTokens,
    model: raw.model,
  };
}

function parseMessage(raw: unknown): ChatMessage | null {
  if (!isRecord(raw) || !isId(raw.id) || !isOneOf(ROLES, raw.role)) return null;
  if (!isText(raw.text, MAX_TEXT_CHARS) || !isCount(raw.createdAt)) return null;
  const message: ChatMessage = { id: raw.id, role: raw.role, text: raw.text, createdAt: raw.createdAt };
  if (raw.model !== undefined) {
    if (!isOneOf(MODEL_IDS, raw.model)) return null;
    message.model = raw.model;
  }
  if (raw.stopReason !== undefined) {
    if (!isOneOf(STOP_REASONS, raw.stopReason)) return null;
    message.stopReason = raw.stopReason;
  }
  if (raw.bordereau !== undefined) {
    const bordereau = parseBordereau(raw.bordereau);
    if (!bordereau) return null;
    message.bordereau = bordereau;
  }
  if (raw.toolCalls !== undefined) {
    const toolCalls = parseList(raw.toolCalls, MAX_TOOL_CALLS_PER_MESSAGE, parseToolCall);
    if (!toolCalls) return null;
    message.toolCalls = toolCalls;
  }
  return message;
}

function parseItem(raw: unknown): ContextItem | null {
  if (!isRecord(raw) || !isId(raw.id) || !isOneOf(CONTEXT_KINDS, raw.kind)) return null;
  if (!isText(raw.title, MAX_TITLE_CHARS) || !isText(raw.text, MAX_TEXT_CHARS)) return null;
  if (raw.url !== null && !isText(raw.url, MAX_URL_CHARS)) return null;
  if (typeof raw.included !== "boolean" || !isOneOf(ITEM_STATUSES, raw.status)) return null;
  const item: ContextItem = {
    id: raw.id,
    kind: raw.kind,
    title: raw.title,
    url: raw.url,
    text: raw.text,
    included: raw.included,
    status: raw.status,
  };
  if (raw.artifactId !== undefined) {
    if (!isId(raw.artifactId)) return null;
    item.artifactId = raw.artifactId;
  }
  return item;
}

export function parseConversation(raw: unknown): Conversation | null {
  if (!isRecord(raw) || !isId(raw.id) || !isText(raw.title, MAX_TITLE_CHARS)) return null;
  if (!isCount(raw.createdAt) || !isCount(raw.updatedAt) || !isOneOf(MODEL_IDS, raw.model)) return null;
  const items = parseList(raw.items, MAX_ITEMS_PER_CONVERSATION, parseItem);
  const messages = parseList(raw.messages, MAX_MESSAGES_PER_CONVERSATION, parseMessage);
  if (!items || !messages) return null;
  return {
    id: raw.id,
    title: raw.title,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    model: raw.model,
    items,
    messages,
  };
}

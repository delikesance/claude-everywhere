import { signal } from "@preact/signals";
import { connectChat } from "../../shared/messaging";
import type { ChatConnection, ChatServerMsg } from "../../shared/messages";
import { t } from "../../shared/i18n";
import type { ApiError, ChatMessage, ContextItem } from "../../shared/types";
import { conversation, draft, removeMessages, updateMessage } from "./conversation";
import { persistConversation } from "./persist";
import { planFor, withoutEmpty } from "./plan";
import { hasKey, settings } from "./session";

export type TurnNotice =
  | Exclude<ApiError, { kind: "aborted" }>
  | { kind: "max_tokens" }
  | { kind: "refusal" }
  | { kind: "interrupted"; words: number };

export type Phase = "idle" | "waiting" | "streaming";

interface ActiveTurn {
  requestId: string;
  userId: string;
  assistantId: string;
  userText: string;
  restoreDraft: boolean;
  connection: ChatConnection;
}

export const phase = signal<Phase>("idle");
export const turnNotice = signal<TurnNotice | null>(null);
export const lastQuestion = signal("");

let active: ActiveTurn | null = null;

const countWords = (text: string): number => text.split(/\s+/).filter(Boolean).length;

function message(role: ChatMessage["role"], text: string): ChatMessage {
  return { id: crypto.randomUUID(), role, text, createdAt: Date.now() };
}

function finishTurn(): void {
  active?.connection.close();
  active = null;
  phase.value = "idle";
}

function rollback(turn: ActiveTurn): void {
  removeMessages([turn.userId, turn.assistantId]);
  if (turn.restoreDraft) draft.value = turn.userText;
}

function answerText(turn: ActiveTurn): string {
  return conversation.value.messages.find((m) => m.id === turn.assistantId)?.text ?? "";
}

function interrupt(turn: ActiveTurn, text: string): void {
  updateMessage(turn.assistantId, { stopReason: "interrupted" });
  turnNotice.value = { kind: "interrupted", words: countWords(text) };
}

function onDelta(turn: ActiveTurn, text: string): void {
  phase.value = "streaming";
  updateMessage(turn.assistantId, { text: answerText(turn) + text });
}

function onDone(turn: ActiveTurn, msg: Extract<ChatServerMsg, { type: "done" }>): void {
  updateMessage(turn.assistantId, { stopReason: msg.stopReason });
  updateMessage(turn.userId, { bordereau: msg.bordereau });
  if (msg.stopReason === "max_tokens") turnNotice.value = { kind: "max_tokens" };
  if (msg.stopReason === "refusal") turnNotice.value = { kind: "refusal" };
  finishTurn();
  void persistConversation();
}

function onError(turn: ActiveTurn, error: ApiError): void {
  const text = answerText(turn);
  if (text === "") rollback(turn);
  else interrupt(turn, text);
  if (error.kind !== "aborted") turnNotice.value = error;
  finishTurn();
  void persistConversation();
}

function handle(turn: ActiveTurn, msg: ChatServerMsg): void {
  if (active !== turn || msg.requestId !== turn.requestId) return;
  if (msg.type === "delta") onDelta(turn, msg.text);
  else if (msg.type === "done") onDone(turn, msg);
  else onError(turn, msg.error);
}

interface TurnContext {
  items: ContextItem[];
  messages: ChatMessage[];
}

const canStart = (userText: string): boolean => phase.value === "idle" && userText.trim() !== "" && hasKey.value;

function startTurn(userText: string, restoreDraft: boolean, context?: TurnContext): void {
  if (!canStart(userText)) return;
  const { model } = conversation.value;
  const { items, messages } = context ?? conversation.value;
  const history = withoutEmpty(messages);
  const user = { ...message("user", userText), bordereau: planFor(userText, items, history).bordereau };
  const assistant = { ...message("assistant", ""), model };
  const connection = connectChat();
  const turn: ActiveTurn = {
    requestId: crypto.randomUUID(),
    userId: user.id,
    assistantId: assistant.id,
    userText,
    restoreDraft,
    connection,
  };
  active = turn;
  lastQuestion.value = userText;
  conversation.value = { ...conversation.value, messages: [...messages, user, assistant] };
  if (restoreDraft) draft.value = "";
  turnNotice.value = null;
  phase.value = "waiting";
  connection.onMessage((msg) => handle(turn, msg));
  connection.start({
    requestId: turn.requestId,
    model,
    items,
    history,
    userText,
    answerLanguage: settings.value.answerLanguage,
    maxTokens: settings.value.maxTokens,
  });
}

export const send = (): void => startTurn(draft.value, true);

export const continueAnswer = (): void => startTurn(t("sidebar_continuePrompt"), false);

export function retry(): void {
  if (draft.value === lastQuestion.value) draft.value = "";
  startTurn(lastQuestion.value, false);
}

function originalItems(items: ContextItem[], original?: ChatMessage): ContextItem[] {
  if (!original?.bordereau) return items;
  const sentIds = new Set(original.bordereau.lines.map((line) => line.itemId));
  return items.map((item) => ({ ...item, included: sentIds.has(item.id) }));
}

export function regenerate(): void {
  const { items, messages } = conversation.value;
  const lastUser = messages.map((m) => m.role).lastIndexOf("user");
  const original = messages[lastUser];
  if (!original) return;
  startTurn(original.text, false, {
    items: originalItems(items, original),
    messages: messages.slice(0, lastUser),
  });
}

export function cancelTurn(): void {
  if (active) active.connection.cancel(active.requestId);
}

export function abandonTurn(): void {
  if (!active) return;
  onError(active, { kind: "aborted" });
}

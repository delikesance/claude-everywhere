import { signal } from "@preact/signals";
import { openLibrary } from "../../library";
import type { Conversation } from "../../shared/types";
import { conversation, resetConversation } from "./conversation";
import { abandonTurn } from "./turn";

export type View = "chat" | "history";
export type ConversationSummary = Omit<Conversation, "messages" | "items">;

export const view = signal<View>("chat");
export const conversations = signal<ConversationSummary[]>([]);

export async function openHistory(): Promise<void> {
  const list = await (await openLibrary()).listConversations();
  conversations.value = [...list].sort((a, b) => b.updatedAt - a.updatedAt);
  view.value = "history";
}

export async function toggleHistory(): Promise<void> {
  if (view.value === "history") view.value = "chat";
  else await openHistory();
}

export function startNewConversation(): void {
  abandonTurn();
  resetConversation();
  view.value = "chat";
}

export async function openConversation(id: string): Promise<void> {
  abandonTurn();
  const stored = await (await openLibrary()).getConversation(id);
  if (!stored) return;
  conversation.value = stored;
  view.value = "chat";
}

export async function removeConversation(id: string): Promise<void> {
  await (await openLibrary()).deleteConversation(id);
  conversations.value = conversations.value.filter((c) => c.id !== id);
  if (conversation.value.id === id) resetConversation();
}

import { computed, signal } from "@preact/signals";
import type { ModelId } from "../../shared/constants";
import type { ChatMessage, ContextItem, Conversation } from "../../shared/types";
import { settings } from "./session";

export function emptyConversation(model: ModelId): Conversation {
  const now = Date.now();
  return { id: crypto.randomUUID(), title: "", createdAt: now, updatedAt: now, model, items: [], messages: [] };
}

export const conversation = signal<Conversation>(emptyConversation(settings.value.defaultModel));
export const draft = signal("");
export const reading = computed(() => conversation.value.items.some((item) => item.status === "loading"));

export function resetConversation(): void {
  conversation.value = emptyConversation(settings.value.defaultModel);
  draft.value = "";
}

export function setModel(model: ModelId): void {
  conversation.value = { ...conversation.value, model };
}

export function updateMessage(id: string, patch: Partial<ChatMessage>): void {
  const messages = conversation.value.messages.map((m) => (m.id === id ? { ...m, ...patch } : m));
  conversation.value = { ...conversation.value, messages };
}

export function removeMessages(ids: string[]): void {
  const messages = conversation.value.messages.filter((m) => !ids.includes(m.id));
  conversation.value = { ...conversation.value, messages };
}

export function setItems(items: ContextItem[]): void {
  conversation.value = { ...conversation.value, items };
}

export const addItem = (item: ContextItem): void => setItems([...conversation.value.items, item]);

export const replaceItem = (id: string, item: ContextItem): void =>
  setItems(conversation.value.items.map((existing) => (existing.id === id ? item : existing)));

export const removeItem = (item: ContextItem): void =>
  setItems(conversation.value.items.filter((existing) => existing.id !== item.id));

export const toggleItem = (item: ContextItem): void =>
  replaceItem(item.id, { ...item, included: !item.included });

export const attachItem = (item: ContextItem): void =>
  setItems([...conversation.value.items.map((existing) => ({ ...existing, included: false })), item]);

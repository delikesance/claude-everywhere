import { openLibrary } from "../../library";
import { conversation } from "./conversation";

const TITLE_MAX_CHARS = 60;

export async function persistConversation(): Promise<void> {
  const current = conversation.value;
  const first = current.messages.find((m) => m.role === "user");
  if (!first) return;
  const saved = { ...current, title: first.text.slice(0, TITLE_MAX_CHARS), updatedAt: Date.now() };
  conversation.value = saved;
  await (await openLibrary()).saveConversation(saved);
}

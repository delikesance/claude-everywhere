import { computed } from "@preact/signals";
import { planContext, renderPrompt } from "../../api/budget";
import type { ContextPlan, OutputReserve } from "../../api/budget";
import type { ChatMessage, ContextItem } from "../../shared/types";
import { conversation, draft } from "./conversation";
import { settings } from "./session";

export const withoutEmpty = (messages: ChatMessage[]): ChatMessage[] => messages.filter((m) => m.text !== "");

export const sentHistory = (): ChatMessage[] => withoutEmpty(conversation.value.messages);

const outputReserve = (history: ChatMessage[]): OutputReserve => ({
  maxTokens: settings.value.maxTokens,
  historyChars: history.reduce((total, m) => total + m.text.length, 0),
});

export const planFor = (
  question: string,
  items: ContextItem[] = conversation.value.items,
  history: ChatMessage[] = sentHistory(),
): ContextPlan => planContext(items, question, conversation.value.model, outputReserve(history));

export const currentPlan = computed(() => planFor(draft.value));

export const currentPrompt = (plan: ContextPlan) => renderPrompt(plan, draft.value, settings.value.answerLanguage);

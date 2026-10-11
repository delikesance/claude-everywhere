import { computed } from "@preact/signals";
import { planContext, renderPrompt } from "../../api/budget";
import type { ContextPlan, OutputReserve } from "../../api/budget";
import type { ChatMessage } from "../../shared/types";
import { conversation, draft } from "./conversation";
import { settings } from "./session";

export const sentHistory = (): ChatMessage[] => conversation.value.messages.filter((m) => m.text !== "");

const outputReserve = (): OutputReserve => ({
  maxTokens: settings.value.maxTokens,
  historyChars: sentHistory().reduce((total, m) => total + m.text.length, 0),
});

export const planFor = (question: string): ContextPlan =>
  planContext(conversation.value.items, question, conversation.value.model, outputReserve());

export const currentPlan = computed(() => planFor(draft.value));

export const currentPrompt = (plan: ContextPlan) => renderPrompt(plan, draft.value, settings.value.answerLanguage);

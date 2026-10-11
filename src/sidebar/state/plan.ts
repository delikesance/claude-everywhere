import { computed } from "@preact/signals";
import { planContext, renderPrompt } from "../../api/budget";
import type { ContextPlan } from "../../api/budget";
import { conversation, draft } from "./conversation";
import { settings } from "./session";

export const planFor = (question: string): ContextPlan =>
  planContext(conversation.value.items, question, conversation.value.model);

export const currentPlan = computed(() => planFor(draft.value));

export const currentPrompt = (plan: ContextPlan) => renderPrompt(plan, draft.value, settings.value.answerLanguage);

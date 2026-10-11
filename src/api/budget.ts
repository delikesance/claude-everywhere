import { CHARS_PER_TOKEN, DEFAULT_MAX_TOKENS, INPUT_BUDGET_CHARS } from "../shared/constants";
import type { ModelId } from "../shared/constants";
import type { MessageKey } from "../shared/i18n";
import type { Bordereau, BordereauLine, ContextItem } from "../shared/types";
import { excerpt, questionTerms } from "./excerpt";
import { renderUserMessage, systemPrompt } from "./prompt";

export interface ContextPlan {
  bordereau: Bordereau;
  blocks: { itemId: string; text: string }[];
}

export interface OutputReserve {
  maxTokens: number;
  historyChars: number;
}

export const MODEL_META: Record<ModelId, { labelKey: MessageKey; rank: 1 | 2 | 3 }> = {
  "claude-haiku-5-5": { labelKey: "shared_modelHaiku", rank: 1 },
  "claude-sonnet-5-5": { labelKey: "shared_modelSonnet", rank: 2 },
  "claude-opus-5-5": { labelKey: "shared_modelOpus", rank: 3 },
};

const PROMPT_OVERHEAD_CHARS = 2000;
const NO_HISTORY: OutputReserve = { maxTokens: DEFAULT_MAX_TOKENS, historyChars: 0 };

const sum = (numbers: number[]): number => numbers.reduce((total, n) => total + n, 0);

function availableChars(model: ModelId, reserve: OutputReserve): number {
  const used = reserve.maxTokens * CHARS_PER_TOKEN + reserve.historyChars + PROMPT_OVERHEAD_CHARS;
  return Math.max(0, INPUT_BUDGET_CHARS[model] - used);
}

export function planContext(
  items: ContextItem[],
  question: string,
  model: ModelId,
  reserve: OutputReserve = NO_HISTORY,
): ContextPlan {
  const included = items.filter((item) => item.included);
  const totalChars = sum(included.map((item) => item.text.length));
  const budgetChars = availableChars(model, reserve);
  const terms = questionTerms(question);
  const fits = totalChars <= budgetChars;
  const blocks = included.map((item) => ({
    itemId: item.id,
    text: fits ? item.text : excerpt(item.text, terms, Math.floor((item.text.length * budgetChars) / totalChars)),
  }));
  const lines: BordereauLine[] = included.map((item, index) => ({
    itemId: item.id,
    title: item.title,
    sentChars: blocks[index]?.text.length ?? 0,
    totalChars: item.text.length,
  }));
  const sentChars = sum(lines.map((line) => line.sentChars));
  const bordereau: Bordereau = {
    lines,
    sentChars,
    totalChars,
    budgetChars,
    truncated: !fits,
    estimatedTokens: Math.ceil(sentChars / CHARS_PER_TOKEN),
    model,
  };
  return { bordereau, blocks };
}

export function renderPrompt(
  plan: ContextPlan,
  userText: string,
  answerLanguage: string,
): { system: string; user: string } {
  const titles = new Map(plan.bordereau.lines.map((line) => [line.itemId, line.title]));
  const items = plan.blocks.map((block) => ({ title: titles.get(block.itemId) ?? "", text: block.text }));
  return { system: systemPrompt(answerLanguage), user: renderUserMessage(items, userText) };
}

import type { ModelId } from "../shared/constants";
import type { MessageKey } from "../shared/i18n";
import type { Bordereau, ContextItem } from "../shared/types";

export interface ContextPlan {
  bordereau: Bordereau;
  blocks: { itemId: string; text: string }[];
}

export const MODEL_META: Record<ModelId, { labelKey: MessageKey; rank: 1 | 2 | 3 }> = {
  "claude-haiku-5-5": { labelKey: "shared_modelHaiku", rank: 1 },
  "claude-sonnet-5-5": { labelKey: "shared_modelSonnet", rank: 2 },
  "claude-opus-5-5": { labelKey: "shared_modelOpus", rank: 3 },
};

export function planContext(_items: ContextItem[], _question: string, _model: ModelId): ContextPlan {
  throw new Error("not implemented");
}

export function renderPrompt(
  _plan: ContextPlan,
  _userText: string,
  _answerLanguage: string,
): { system: string; user: string } {
  throw new Error("not implemented");
}

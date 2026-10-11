import { t } from "../../shared/i18n";
import type { MessageKey } from "../../shared/i18n";
import type { ChatMessage } from "../../shared/types";
import { AssistantMessage, Markdown } from "../../shared/ui";
import { MODEL_META } from "../../api/budget";
import type { Phase } from "../state/turn";
import { AnswerActions } from "./AnswerActions";
import { useFrameValue } from "./hooks";

export interface AssistantTurnProps {
  message: ChatMessage;
  number: number;
  phase: Phase | null;
  onRegenerate?: (() => void) | undefined;
}

const LIVE_STATUS: Record<Phase, MessageKey | null> = {
  idle: null,
  waiting: "sidebar_statusWaiting",
  streaming: "sidebar_statusWriting",
};

function statusText(message: ChatMessage, live: Phase | null): string {
  const liveKey = live && LIVE_STATUS[live];
  if (liveKey) return t(liveKey);
  if (message.stopReason === "interrupted") return t("sidebar_statusInterrupted");
  const model = message.model ? t(MODEL_META[message.model].labelKey) : "";
  return t("sidebar_statusDone", { model });
}

export function AssistantTurn({ message, number, phase, onRegenerate }: AssistantTurnProps) {
  const live = phase !== null && phase !== "idle";
  const shown = useFrameValue(message.text);
  return (
    <AssistantMessage label={t("sidebar_answerLabel", { number })} number={number}>
      <div class="reading" aria-busy={live}>
        <Markdown source={live ? shown : message.text} />
        {phase === "streaming" && <span class="caret" aria-hidden="true" />}
      </div>
      <div class="msg-footer">
        <span class={live ? "status-tag" : "caption"} role="status">
          {statusText(message, phase)}
          {live && <span class="ellipsis" aria-hidden="true" />}
        </span>
        {!live && message.text !== "" && <AnswerActions markdown={message.text} onRegenerate={onRegenerate} />}
      </div>
    </AssistantMessage>
  );
}

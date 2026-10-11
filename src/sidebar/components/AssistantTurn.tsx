import { t } from "../../shared/i18n";
import type { MessageKey } from "../../shared/i18n";
import type { ChatMessage } from "../../shared/types";
import { AssistantMessage, Button, Icon, Markdown } from "../../shared/ui";
import { MODEL_META } from "../../api/budget";
import type { Phase } from "../state/turn";
import { useFrameValue } from "./hooks";
import { FollowUps } from "./FollowUps";
import { CopyButton, KeepButton } from "./TurnActions";

export interface AssistantTurnProps {
  message: ChatMessage;
  number: number;
  phase: Phase | null;
  onRegenerate?: (() => void) | undefined;
  onFollowUp?: ((text: string) => void) | undefined;
}

const FOLLOW_UP_KEYS = ["sidebar_followUpDetail", "sidebar_followUpCompare"] as const;

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

export function AssistantTurn({ message, number, phase, onRegenerate, onFollowUp }: AssistantTurnProps) {
  const live = phase !== null && phase !== "idle";
  const shown = useFrameValue(message.text);
  return (
    <AssistantMessage label={t("sidebar_answerLabel", { number })} number={number}>
      <div class="reading" aria-busy={live}>
        <Markdown source={live ? shown : message.text} />
        {phase === "streaming" && <span class="caret anim-caret" aria-hidden="true" />}
      </div>
      <div class="msg-footer">
        <span class={live ? "status-tag" : "caption"} role="status">
          {live && (
            <span class="anim-dots" aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
          )}
          {statusText(message, phase)}
        </span>
        {!live && message.text !== "" && (
          <>
            <KeepButton markdown={message.text} />
            <CopyButton markdown={message.text} />
            {onRegenerate && (
              <Button variant="quiet" compact onClick={onRegenerate}>
                <Icon name="rotateCw" />
                {t("sidebar_regenerate")}
              </Button>
            )}
          </>
        )}
      </div>
      {!live && message.text !== "" && onFollowUp && (
        <FollowUps suggestions={FOLLOW_UP_KEYS.map((key) => t(key))} onPick={onFollowUp} />
      )}
    </AssistantMessage>
  );
}

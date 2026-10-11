import { t } from "../../shared/i18n";
import { Icon } from "../../shared/ui";
import { conversation } from "../state/conversation";
import { phase, regenerate, turnNotice } from "../state/turn";
import { AssistantTurn } from "./AssistantTurn";
import { useScrolledUp } from "./hooks";
import { TurnNoticeView } from "./TurnNoticeView";
import { UserTurn } from "./UserTurn";

function EmptyMargin() {
  return (
    <div class="sb-empty">
      <h2>{t("sidebar_emptyTitle")}</h2>
      <p class="caption">{t("sidebar_emptyBody")}</p>
    </div>
  );
}

export function ConversationView() {
  const { messages } = conversation.value;
  const { ref, scrolledUp, scrollToBottom } = useScrolledUp();
  const lastId = messages[messages.length - 1]?.id;
  let answerNumber = 0;
  return (
    <div class="sb-conv" ref={ref}>
      {messages.length === 0 && <EmptyMargin />}
      {messages.map((message) => {
        if (message.role === "user") return <UserTurn key={message.id} message={message} />;
        answerNumber += 1;
        const isLast = message.id === lastId;
        return (
          <AssistantTurn
            key={message.id}
            message={message}
            number={answerNumber}
            phase={isLast ? phase.value : null}
            onRegenerate={isLast ? regenerate : undefined}
          />
        );
      })}
      {turnNotice.value && <TurnNoticeView notice={turnNotice.value} />}
      {scrolledUp && (
        <button type="button" class="btn btn--secondary btn--compact scroll-down" onClick={scrollToBottom}>
          <Icon name="arrowDown" />
          {t("sidebar_scrollDown")}
        </button>
      )}
    </div>
  );
}

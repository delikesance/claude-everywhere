import { t } from "../../shared/i18n";
import { conversation } from "../state/conversation";
import { phase, turnNotice } from "../state/turn";
import { AssistantTurn } from "./AssistantTurn";
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
  const lastId = messages[messages.length - 1]?.id;
  let answerNumber = 0;
  return (
    <div class="sb-conv">
      {messages.length === 0 && <EmptyMargin />}
      {messages.map((message) => {
        if (message.role === "user") return <UserTurn key={message.id} message={message} />;
        answerNumber += 1;
        const live = message.id === lastId ? phase.value : null;
        return <AssistantTurn key={message.id} message={message} number={answerNumber} phase={live} />;
      })}
      {turnNotice.value && <TurnNoticeView notice={turnNotice.value} />}
    </div>
  );
}

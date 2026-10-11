import { t } from "../../shared/i18n";
import { Icon } from "../../shared/ui";
import { conversation, draft } from "../state/conversation";
import { phase, regenerate, send, turnNotice } from "../state/turn";
import { AssistantTurn } from "./AssistantTurn";
import { useScrolledUp } from "./hooks";
import { TurnNoticeView } from "./TurnNoticeView";
import { UserTurn } from "./UserTurn";

const SCROLL_DOWN_STYLE = { position: "sticky", bottom: "var(--s-8)", justifySelf: "end" } as const;
const SUGGESTIONS_STYLE = { display: "grid", gap: "var(--s-8)" } as const;
const SUGGESTION_KEYS = ["sidebar_suggestSummary", "sidebar_suggestSimple", "sidebar_suggestFigures"] as const;

function ask(text: string): void {
  draft.value = text;
  send();
}

function Suggestion({ textKey, index }: { textKey: (typeof SUGGESTION_KEYS)[number]; index: number }) {
  return (
    <button type="button" class="suggestion anim-rise" style={`--i:${index}`} onClick={() => ask(t(textKey))}>
      {t(textKey)}
    </button>
  );
}

function EmptyMargin() {
  return (
    <div class="sb-empty anim-rise" style="--i:0">
      <h1>{t("sidebar_askPage")}</h1>
      <div style={SUGGESTIONS_STYLE}>
        {SUGGESTION_KEYS.map((textKey, index) => (
          <Suggestion key={textKey} textKey={textKey} index={index + 1} />
        ))}
      </div>
    </div>
  );
}

export function ConversationView() {
  const { id, messages } = conversation.value;
  const { ref, scrolledUp, scrollToBottom } = useScrolledUp(messages, id);
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
            onFollowUp={isLast ? ask : undefined}
          />
        );
      })}
      {turnNotice.value && <TurnNoticeView notice={turnNotice.value} />}
      {scrolledUp && (
        <button type="button" class="btn btn--secondary btn--compact scroll-down"
          style={SCROLL_DOWN_STYLE}
          onClick={scrollToBottom}>
          <Icon name="arrowDown" />
          {t("sidebar_scrollDown")}
        </button>
      )}
    </div>
  );
}

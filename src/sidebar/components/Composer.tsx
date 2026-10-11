import { useEffect, useLayoutEffect, useRef, useState } from "preact/hooks";
import { t } from "../../shared/i18n";
import { Icon } from "../../shared/ui";
import { conversation, draft, reading } from "../state/conversation";
import { hasKey } from "../state/session";
import { cancelTurn, phase, send } from "../state/turn";
import { ComposerMenu } from "./ComposerMenu";
import { LibraryPicker } from "./LibraryPicker";

function onComposerKey(event: KeyboardEvent): void {
  if (event.key !== "Enter" || event.shiftKey || event.isComposing) return;
  event.preventDefault();
  send();
}

function SendOrStop() {
  if (phase.value !== "idle") {
    return (
      <button
        type="button"
        class="btn btn--secondary btn--icon-only btn--stop"
        aria-label={t("sidebar_stop")}
        title={`${t("sidebar_stop")} (${t("sidebar_stopKey")})`}
        onClick={cancelTurn}
      >
        <span class="stop-square" />
      </button>
    );
  }
  const disabled = !hasKey.value || reading.value || draft.value.trim() === "";
  return (
    <button
      type="button"
      class="btn btn--primary btn--icon-only btn--send"
      aria-label={t("sidebar_send")}
      aria-disabled={disabled}
      onClick={disabled ? undefined : send}
    >
      <Icon name="arrowUpRight" />
    </button>
  );
}

export function Composer() {
  const [picking, setPicking] = useState(false);
  const input = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (hasKey.value) input.current?.focus();
  }, [hasKey.value]);
  useLayoutEffect(() => {
    const field = input.current;
    if (!field) return;
    field.style.height = "auto";
    field.style.height = `${field.scrollHeight}px`;
  }, [draft.value]);
  const placeholder = conversation.value.messages.length === 0 ? "sidebar_placeholder" : "sidebar_replyPlaceholder";
  return (
    <>
      <div class="sb-field">
        <ComposerMenu onPickLibrary={() => setPicking(true)} />
        <textarea
          ref={input}
          class="sb-input"
          rows={1}
          aria-label={t("sidebar_messageLabel")}
          placeholder={t(placeholder)}
          disabled={!hasKey.value}
          value={draft.value}
          onInput={(event) => (draft.value = event.currentTarget.value)}
          onKeyDown={onComposerKey}
        />
        <SendOrStop />
      </div>
      {picking && <LibraryPicker onClose={() => setPicking(false)} />}
    </>
  );
}

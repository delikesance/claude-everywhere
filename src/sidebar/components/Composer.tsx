import { MODEL_META } from "../../api/budget";
import { MODEL_IDS } from "../../shared/constants";
import type { ModelId } from "../../shared/constants";
import { t } from "../../shared/i18n";
import { Button, Icon, Select, Textarea } from "../../shared/ui";
import { conversation, draft, setModel } from "../state/conversation";
import { hasKey } from "../state/session";
import { cancelTurn, phase, send } from "../state/turn";

function onComposerKey(event: KeyboardEvent): void {
  if (event.key !== "Enter" || event.shiftKey || event.isComposing) return;
  event.preventDefault();
  send();
}

function ModelSelect() {
  return (
    <Select
      aria-label={t("sidebar_modelLabel")}
      value={conversation.value.model}
      onChange={(event) => setModel(event.currentTarget.value as ModelId)}
    >
      {MODEL_IDS.map((model) => (
        <option key={model} value={model}>
          {t(MODEL_META[model].labelKey)}
        </option>
      ))}
    </Select>
  );
}

function SendOrStop() {
  if (phase.value !== "idle") {
    return (
      <button type="button" class="btn btn--secondary btn--compact btn--stop" onClick={cancelTurn}>
        <span class="stop-square" />
        {t("sidebar_stop")} <kbd>{t("sidebar_stopKey")}</kbd>
      </button>
    );
  }
  return (
    <Button variant="primary" compact disabled={!hasKey.value || draft.value.trim() === ""} onClick={send}>
      <Icon name="egress" />
      {t("sidebar_send")}
    </Button>
  );
}

export function Composer() {
  return (
    <>
      <Textarea
        rows={1}
        aria-label={t("sidebar_messageLabel")}
        placeholder={t("sidebar_placeholder")}
        disabled={!hasKey.value}
        value={draft.value}
        onInput={(event) => (draft.value = event.currentTarget.value)}
        onKeyDown={onComposerKey}
      />
      <div class="sb-row">
        <ModelSelect />
        <SendOrStop />
      </div>
      <p class="caption">{t("sidebar_privacy")}</p>
    </>
  );
}

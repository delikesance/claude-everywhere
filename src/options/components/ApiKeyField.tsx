import { useState } from "preact/hooks";
import { t } from "../../shared/i18n";
import type { MessageKey } from "../../shared/i18n";
import { Button, cx, Field, Icon, Input } from "../../shared/ui";
import type { IconName } from "../../shared/ui";
import { InlineConfirm } from "./InlineConfirm";
import { maskKey } from "./maskKey";
import { isStored, submitKey } from "./submitKey";
import type { KeyOutcome } from "./submitKey";

type Feedback = { messageKey: MessageKey; tone: "ok" | "error" | "warning"; icon: IconName };

const FEEDBACK: Record<KeyOutcome, Feedback> = {
  valid: { messageKey: "options_keyValid", tone: "ok", icon: "check" },
  warning: { messageKey: "options_keyWarning", tone: "warning", icon: "triangleAlert" },
  empty: { messageKey: "options_keyEmpty", tone: "error", icon: "circleAlert" },
  refused: { messageKey: "options_keyPermissionRefused", tone: "error", icon: "circleAlert" },
  auth: { messageKey: "options_keyAuthError", tone: "error", icon: "circleAlert" },
  network: { messageKey: "options_keyNetworkError", tone: "error", icon: "circleAlert" },
  unknown: { messageKey: "options_keyUnknownError", tone: "error", icon: "circleAlert" },
};

interface ApiKeyFieldProps {
  storedKey: string | null;
  onOutcome: (outcome: KeyOutcome) => void;
  onClear?: () => void;
}

export function ApiKeyField({ storedKey, onOutcome, onClear }: ApiKeyFieldProps) {
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<KeyOutcome | null>(null);
  const feedback = outcome ? FEEDBACK[outcome] : null;

  const submit = (event: Event) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    submitKey(draft)
      .then((result) => {
        setOutcome(result);
        if (isStored(result)) setDraft("");
        onOutcome(result);
      })
      .catch(() => setOutcome("unknown"))
      .finally(() => setBusy(false));
  };

  return (
    <form class="stack" onSubmit={submit}>
      <Field id="api-key" label={t("options_keyLabel")} help={t("options_keyHelp")}>
        {(control) => (
          <div class="row">
            <Input
              {...control}
              class="grow"
              type="password"
              autocomplete="off"
              value={draft}
              aria-invalid={feedback?.tone === "error" ? "true" : undefined}
              onInput={(event) => setDraft(event.currentTarget.value)}
            />
            <Button type="submit" disabled={busy}>
              {busy ? t("options_keyValidating") : t("options_keyValidate")}
            </Button>
          </div>
        )}
      </Field>
      <div role="status">
        {feedback && (
          <p class={cx("help", feedback.tone === "ok" && "help--ok", feedback.tone === "error" && "help--error")}>
            <Icon name={feedback.icon} />
            {t(feedback.messageKey)}
          </p>
        )}
      </div>
      {storedKey && onClear && (
        <div class="row">
          <span class="caption grow">{t("options_keyStored", { mask: maskKey(storedKey) })}</span>
          <InlineConfirm
            triggerLabel={t("options_keyClear")}
            question={t("options_keyClearConfirm")}
            confirmLabel={t("options_keyClearYes")}
            onConfirm={onClear}
          />
        </div>
      )}
    </form>
  );
}

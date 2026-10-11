import { useState } from "preact/hooks";
import { submitKey, type KeyOutcome } from "../../options/components/submitKey";
import { t } from "../../shared/i18n";
import { patchSettings } from "../../shared/settings";
import type { MessageKey } from "../../shared/i18n";
import { Button } from "../../shared/ui";
import { Field, Input, type HelpTone } from "../../shared/ui/Field";

const KEY_HELP_URL = "https://console.anthropic.com/settings/keys";

const OUTCOME_MESSAGES: Record<Exclude<KeyOutcome, "valid" | "warning">, MessageKey> = {
  empty: "sidebar_key_empty",
  refused: "sidebar_key_refused",
  auth: "sidebar_key_invalid",
  network: "sidebar_key_network",
  unknown: "sidebar_key_unknown",
};

const isAccepted = (outcome: KeyOutcome) => outcome === "valid" || outcome === "warning";

export function MissingKey() {
  const [rawKey, setRawKey] = useState("");
  const [outcome, setOutcome] = useState<KeyOutcome | null>(null);

  const validate = async (key: string) => {
    setRawKey(key);
    setOutcome(await submitKey(key));
  };

  const useClaudeCode = () => void patchSettings({ backend: "claude-code" });

  return (
    <section class="key-setup anim-rise" aria-labelledby="key-setup-title">
      <h2 id="key-setup-title" class="key-setup__title">
        {t("sidebar_key_title")}
      </h2>
      <p class="key-setup__intro">{t("sidebar_key_intro")}</p>
      <Field id="key-setup-input" label={t("sidebar_key_label")} {...(outcome ? feedbackFor(outcome) : {})}>
        {(control) => (
          <Input
            {...control}
            type="password"
            autoComplete="off"
            spellcheck={false}
            placeholder="sk-ant-…"
            value={rawKey}
            onInput={(event) => setRawKey(event.currentTarget.value)}
            onPaste={(event) => void validate(event.clipboardData?.getData("text") ?? rawKey)}
          />
        )}
      </Field>
      <Button variant="primary" large onClick={() => void validate(rawKey)} disabled={outcome !== null && isAccepted(outcome)}>
        {t("sidebar_key_start")}
      </Button>
      <a class="key-setup__help" href={KEY_HELP_URL} target="_blank" rel="noreferrer">
        {t("sidebar_key_where")}
      </a>
      <div class="key-setup__divider" role="separator">
        {t("sidebar_key_or")}
      </div>
      <Button onClick={useClaudeCode}>{t("sidebar_key_claudeCode")}</Button>
    </section>
  );
}

function feedbackFor(outcome: KeyOutcome): { help: string; helpTone: HelpTone } {
  if (isAccepted(outcome)) return { help: t("sidebar_key_valid"), helpTone: "ok" };
  return { help: t(OUTCOME_MESSAGES[outcome]), helpTone: "error" };
}

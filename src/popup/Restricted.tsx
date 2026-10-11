import { useState } from "preact/hooks";
import { t } from "../shared/i18n";
import { Button } from "../shared/ui/Button";
import { Field, Textarea } from "../shared/ui/Field";
import { Notice } from "../shared/ui/Notice";

export function Restricted({ onPaste }: { onPaste: (text: string) => void }) {
  const [text, setText] = useState("");
  return (
    <div class="stack">
      <Notice tone="warning" title={t("popup_restrictedTitle")}>
        {t("popup_restrictedBody")}
      </Notice>
      <Field id="paste-text" label={t("popup_pasteLabel")}>
        {(control) => <Textarea {...control} value={text} onInput={(event) => setText(event.currentTarget.value)} />}
      </Field>
      <Button variant="primary" disabled={!text.trim()} onClick={() => onPaste(text)}>
        {t("popup_pasteUse")}
      </Button>
    </div>
  );
}

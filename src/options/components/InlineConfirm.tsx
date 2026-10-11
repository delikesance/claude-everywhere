import { useState } from "preact/hooks";
import { t } from "../../shared/i18n";
import { Button } from "../../shared/ui";

interface InlineConfirmProps {
  triggerLabel: string;
  question: string;
  confirmLabel: string;
  onConfirm: () => void;
}

export function InlineConfirm({ triggerLabel, question, confirmLabel, onConfirm }: InlineConfirmProps) {
  const [asking, setAsking] = useState(false);
  if (!asking) {
    return (
      <Button variant="danger" onClick={() => setAsking(true)}>
        {triggerLabel}
      </Button>
    );
  }
  return (
    <div class="row" role="group" aria-label={question}>
      <span>{question}</span>
      <Button
        variant="danger-solid"
        onClick={() => {
          setAsking(false);
          onConfirm();
        }}
      >
        {confirmLabel}
      </Button>
      <Button onClick={() => setAsking(false)}>{t("options_cancel")}</Button>
    </div>
  );
}

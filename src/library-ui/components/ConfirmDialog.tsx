import { useEffect, useRef } from "preact/hooks";
import { t } from "../../shared/i18n";
import { Button, Dialog } from "../../shared/ui";

interface ConfirmDialogProps {
  title: string;
  body: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ title, body, confirmLabel, onConfirm, onCancel }: ConfirmDialogProps) {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => host.current?.querySelector("button")?.focus(), []);
  return (
    <Dialog titleId="library-confirm-title" title={title} onClose={onCancel}>
      <div ref={host} class="stack">
        <p>{body}</p>
        <div class="row">
          <Button onClick={onCancel}>{t("library_ui_cancel")}</Button>
          <Button variant="danger-solid" onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

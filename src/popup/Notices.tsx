import { t } from "../shared/i18n";
import { Button } from "../shared/ui/Button";
import { Notice } from "../shared/ui/Notice";

export function NoKey({ onAddKey }: { onAddKey: () => void }) {
  return (
    <Notice
      tone="warning"
      title={t("popup_noKeyTitle")}
      actions={
        <Button variant="primary" compact onClick={onAddKey}>
          {t("popup_addKey")}
        </Button>
      }
    >
      {t("popup_noKeyBody")}
    </Notice>
  );
}

export function Unreadable({ onBack }: { onBack: () => void }) {
  return (
    <Notice
      tone="error"
      title={t("popup_unreadableTitle")}
      actions={
        <Button compact onClick={onBack}>
          {t("popup_cancel")}
        </Button>
      }
    >
      {t("popup_unreadableBody")}
    </Notice>
  );
}

export function Failure({ onBack }: { onBack: () => void }) {
  return (
    <Notice
      tone="error"
      title={t("popup_errorTitle")}
      actions={
        <Button compact onClick={onBack}>
          {t("popup_cancel")}
        </Button>
      }
    >
      {t("popup_errorBody")}
    </Notice>
  );
}

export function Saved({ onOpenLibrary }: { onOpenLibrary: () => void }) {
  return (
    <Notice
      tone="success"
      title={t("popup_savedTitle")}
      actions={
        <Button compact onClick={onOpenLibrary}>
          {t("popup_openLibrary")}
        </Button>
      }
    >
      {t("popup_savedBody")}
    </Notice>
  );
}

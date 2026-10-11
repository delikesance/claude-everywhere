import { t } from "../../shared/i18n";
import { Button, Notice } from "../../shared/ui";
import { openOptions } from "./actions";

export function MissingKey() {
  return (
    <Notice
      tone="warning"
      title={t("sidebar_noKeyTitle")}
      actions={
        <Button compact onClick={openOptions}>
          {t("sidebar_noKeyAction")}
        </Button>
      }
    />
  );
}

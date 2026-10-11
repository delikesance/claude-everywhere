import { t } from "../../shared/i18n";
import { Button, Icon } from "../../shared/ui";

export function LibraryFooter({ onExport }: { onExport: () => void }) {
  return (
    <footer class="lib__foot">
      <span class="caption grow">{t("library_ui_openHint")}</span>
      <Button compact onClick={onExport}>
        <Icon name="egress" />
        {t("library_ui_exportAll")}
      </Button>
    </footer>
  );
}

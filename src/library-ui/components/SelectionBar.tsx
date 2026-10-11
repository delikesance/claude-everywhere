import { t } from "../../shared/i18n";
import { Button, Icon } from "../../shared/ui";

interface SelectionBarProps {
  count: number;
  onAttach: () => void;
  onExport: () => void;
  onClear: () => void;
}

export function SelectionBar({ count, onAttach, onExport, onClear }: SelectionBarProps) {
  return (
    <div class="row" role="group" aria-label={t("library_ui_selectedCount", { count })}>
      <span class="caption grow">{t("library_ui_selectedCount", { count })}</span>
      <Button variant="primary" compact onClick={onAttach}>
        <Icon name="egress" />
        {t("library_ui_attach")}
      </Button>
      <Button compact onClick={onExport}>
        {t("library_ui_exportBatch")}
      </Button>
      <Button variant="quiet" compact onClick={onClear}>
        {t("library_ui_clearSelection")}
      </Button>
    </div>
  );
}

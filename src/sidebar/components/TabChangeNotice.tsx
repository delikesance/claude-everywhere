import { t } from "../../shared/i18n";
import { Button } from "../../shared/ui";

export interface TabChangeNoticeProps {
  title: string;
  onRead: () => void;
  onKeep: () => void;
}

export function TabChangeNotice({ title, onRead, onKeep }: TabChangeNoticeProps) {
  return (
    <div class="tab-notice anim-drop" role="status">
      <p class="tab-notice__title">{title ? t("sidebar_tabChangedTitle", { title }) : t("sidebar_tabChangedGeneric")}</p>
      <p class="tab-notice__body">{t("sidebar_tabChangedBody")}</p>
      <div class="tab-notice__actions">
        <Button variant="primary" compact onClick={onRead}>
          {t("sidebar_readPage")}
        </Button>
        <Button compact onClick={onKeep}>
          {t("sidebar_keepPreviousPage")}
        </Button>
      </div>
    </div>
  );
}

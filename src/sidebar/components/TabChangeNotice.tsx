import { t } from "../../shared/i18n";
import { Button, Notice } from "../../shared/ui";

export interface TabChangeNoticeProps {
  title: string;
  onRead: () => void;
  onKeep: () => void;
}

export function TabChangeNotice({ title, onRead, onKeep }: TabChangeNoticeProps) {
  return (
    <div class="notice--drop">
      <Notice
        title={t("sidebar_tabChangedTitle", { title })}
        actions={
          <>
            <Button variant="primary" compact onClick={onRead}>
              {t("sidebar_readPage")}
            </Button>
            <Button compact onClick={onKeep}>
              {t("sidebar_keepPreviousPage")}
            </Button>
          </>
        }
      />
    </div>
  );
}

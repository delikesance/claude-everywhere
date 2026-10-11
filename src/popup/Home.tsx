import { t } from "../shared/i18n";
import { Button, IconButton } from "../shared/ui/Button";
import { Icon } from "../shared/ui/Icon";

export interface HomeProps {
  onAsk: () => void;
  onSave: () => void;
  onOpenLibrary: () => void;
}

export function Home({ onAsk, onSave, onOpenLibrary }: HomeProps) {
  return (
    <>
      <p class="overline">{t("popup_sectionPage")}</p>
      <Button variant="primary" onClick={onAsk}>
        {t("popup_ask")}
      </Button>
      <Button onClick={onSave}>{t("popup_save")}</Button>
      <Button variant="quiet" onClick={onOpenLibrary}>
        <Icon name="library" />
        {t("popup_openLibrary")}
      </Button>
    </>
  );
}

export function Header({ onOpenOptions }: { onOpenOptions: () => void }) {
  return (
    <header class="sb-header">
      <span class="wordmark">{t("popup_title")}</span>
      <IconButton icon="settings" label={t("popup_openOptions")} onClick={onOpenOptions} />
    </header>
  );
}

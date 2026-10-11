import { t } from "../../shared/i18n";
import { IconButton } from "../../shared/ui";
import { startNewConversation, toggleHistory, view } from "../state/history";
import { openLibraryPage, openOptions } from "./actions";

export function Header() {
  return (
    <div class="sb-header">
      <span class="wordmark">{t("shared_extName")}</span>
      <span class="row">
        <IconButton
          icon="history"
          label={view.value === "history" ? t("sidebar_backToChat") : t("sidebar_history")}
          onClick={() => void toggleHistory()}
        />
        <IconButton icon="squarePen" label={t("sidebar_newConversation")} onClick={startNewConversation} />
        <IconButton icon="library" label={t("sidebar_library")} onClick={openLibraryPage} />
        <IconButton icon="settings" label={t("sidebar_settings")} onClick={openOptions} />
      </span>
    </div>
  );
}

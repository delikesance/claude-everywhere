import { t } from "../../shared/i18n";
import { Icon, IconButton } from "../../shared/ui";
import { conversation } from "../state/conversation";
import { startNewConversation, toggleHistory, view } from "../state/history";
import { openLibraryPage } from "./actions";

export function Header() {
  const historyOpen = view.value === "history";
  return (
    <div class="sb-header">
      <button
        type="button"
        class="sb-title"
        aria-label={t("sidebar_history")}
        aria-expanded={historyOpen}
        onClick={() => void toggleHistory()}
      >
        <span class="sb-title__text">{conversation.value.title || t("sidebar_newConversation")}</span>
        <Icon name="chevronDown" />
      </button>
      <span class="sb-actions">
        <IconButton icon="squarePen" label={t("sidebar_newConversation")} onClick={startNewConversation} />
        <IconButton icon="library" label={t("sidebar_library")} onClick={openLibraryPage} />
      </span>
    </div>
  );
}

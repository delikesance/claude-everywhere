import { t } from "../../shared/i18n";
import { IconButton } from "../../shared/ui";
import { conversations, openConversation, removeConversation } from "../state/history";

export function HistoryList() {
  if (conversations.value.length === 0) {
    return (
      <div class="sb-conv">
        <div class="sb-empty">
          <h2>{t("sidebar_historyEmpty")}</h2>
        </div>
      </div>
    );
  }
  return (
    <div class="sb-conv">
      <h2 class="overline">{t("sidebar_historyTitle")}</h2>
      <ul>
        {conversations.value.map((c) => (
          <li key={c.id} class="row">
            <button type="button" class="btn btn--quiet grow" onClick={() => void openConversation(c.id)}>
              {c.title || t("sidebar_untitled")}
            </button>
            <IconButton icon="x" label={t("sidebar_deleteConversation")} onClick={() => void removeConversation(c.id)} />
          </li>
        ))}
      </ul>
    </div>
  );
}

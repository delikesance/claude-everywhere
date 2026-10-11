import { useState } from "preact/hooks";
import { t } from "../../shared/i18n";
import { Button, Dialog, IconButton } from "../../shared/ui";
import { conversations, openConversation, removeConversation } from "../state/history";

function ConfirmDelete({ id, onClose }: { id: string; onClose: () => void }) {
  const confirm = async () => {
    await removeConversation(id);
    onClose();
  };
  return (
    <Dialog titleId="confirm-delete-title" title={t("sidebar_confirmDeleteTitle")} onClose={onClose}>
      <p>{t("sidebar_confirmDeleteBody")}</p>
      <div class="row row--end">
        <Button variant="quiet" onClick={onClose}>
          {t("sidebar_cancel")}
        </Button>
        <Button variant="danger-solid" onClick={() => void confirm()}>
          {t("sidebar_delete")}
        </Button>
      </div>
    </Dialog>
  );
}

export function HistoryList() {
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
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
            <IconButton icon="x" label={t("sidebar_deleteConversation")} onClick={() => setPendingDelete(c.id)} />
          </li>
        ))}
      </ul>
      {pendingDelete && <ConfirmDelete id={pendingDelete} onClose={() => setPendingDelete(null)} />}
    </div>
  );
}

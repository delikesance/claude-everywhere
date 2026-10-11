import { t } from "../../shared/i18n";
import { Button, Chip } from "../../shared/ui";
import { capture } from "../state/intake";
import { conversation, removeItem, toggleItem } from "../state/conversation";

export function ContextBar() {
  const { items } = conversation.value;
  return (
    <>
      {items.length > 0 && (
        <div class="sb-chips">
          {items.map((item) => (
            <Chip key={item.id} item={item} onToggle={toggleItem} onRemove={removeItem} />
          ))}
        </div>
      )}
      <div class="sb-row">
        <span class="row">
          <Button variant="quiet" compact onClick={() => void capture("page")}>
            {t("sidebar_addPage")}
          </Button>
          <Button variant="quiet" compact onClick={() => void capture("selection")}>
            {t("sidebar_addSelection")}
          </Button>
        </span>
      </div>
    </>
  );
}

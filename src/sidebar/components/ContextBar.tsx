import { useState } from "preact/hooks";
import { formatChars } from "../../shared/format";
import { t } from "../../shared/i18n";
import type { BordereauLine, ContextItem } from "../../shared/types";
import { Button, Chip } from "../../shared/ui";
import { capture } from "../state/intake";
import { conversation, removeItem, toggleItem } from "../state/conversation";
import { currentPlan } from "../state/plan";
import { LibraryPicker } from "./LibraryPicker";

function ContextChip({ item, line }: { item: ContextItem; line: BordereauLine | undefined }) {
  return (
    <span class="row">
      <Chip item={item} onToggle={toggleItem} onRemove={removeItem} />
      {line && (
        <span class="caption">
          {t("sidebar_chipSent", { sent: formatChars(line.sentChars), total: formatChars(line.totalChars) })}
        </span>
      )}
    </span>
  );
}

export function ContextBar() {
  const [picking, setPicking] = useState(false);
  const { items } = conversation.value;
  const lines = new Map(currentPlan.value.bordereau.lines.map((line) => [line.itemId, line]));
  return (
    <>
      {items.length > 0 && (
        <div class="sb-chips">
          {items.map((item) => (
            <ContextChip key={item.id} item={item} line={lines.get(item.id)} />
          ))}
        </div>
      )}
      <div class="sb-row row">
        <Button variant="quiet" compact onClick={() => void capture("page")}>
          {t("sidebar_addPage")}
        </Button>
        <Button variant="quiet" compact onClick={() => void capture("selection")}>
          {t("sidebar_addSelection")}
        </Button>
        <Button variant="quiet" compact onClick={() => setPicking(true)}>
          {t("sidebar_addLibrary")}
        </Button>
      </div>
      {picking && <LibraryPicker onClose={() => setPicking(false)} />}
    </>
  );
}

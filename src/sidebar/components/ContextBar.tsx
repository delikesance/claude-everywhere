import { useState } from "preact/hooks";
import { formatChars } from "../../shared/format";
import { t } from "../../shared/i18n";
import type { BordereauLine, ContextItem } from "../../shared/types";
import { Button, Chip, cx } from "../../shared/ui";
import { capture } from "../state/intake";
import { conversation, removeItem, toggleItem } from "../state/conversation";
import { currentPlan } from "../state/plan";
import { LibraryPicker } from "./LibraryPicker";
import { ProtectedNotice } from "./ProtectedNotice";

function ReadingChip() {
  return (
    <span class="chip chip--reading" role="status">
      <span class="kind" aria-hidden="true">¶</span>
      {t("sidebar_reading")}
      <span class="anim-dots" aria-hidden="true">
        <span />
        <span />
        <span />
      </span>
    </span>
  );
}

function ContextChip({ item, line }: { item: ContextItem; line: BordereauLine | undefined }) {
  if (item.status === "loading") return <ReadingChip />;
  return (
    <span class={cx("row", item.included && "anim-sweep")}>
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
  const protectedPage = items.some((item) => item.status === "unreadable");
  const readable = items.filter((item) => item.status !== "unreadable");
  return (
    <>
      {protectedPage && <ProtectedNotice />}
      {readable.length > 0 && (
        <div class="sb-chips">
          {readable.map((item) => (
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

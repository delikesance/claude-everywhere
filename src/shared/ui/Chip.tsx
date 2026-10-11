import { formatChars } from "../format";
import { t } from "../i18n";
import type { ContextItem, ContextKind } from "../types";
import { cx } from "./cx";
import { Icon } from "./Icon";

const KIND_MARK: Record<ContextKind, string> = {
  page: "¶",
  selection: "« »",
  pdf: "¶",
  artifact: "§",
  note: "§",
};

export interface ChipProps {
  item: ContextItem;
  onToggle?: (item: ContextItem) => void;
  onRemove?: (item: ContextItem) => void;
}

export function Chip({ item, onToggle, onRemove }: ChipProps) {
  if (item.status === "loading") {
    return (
      <span class="chip chip--loading">
        <span class="kind">{KIND_MARK[item.kind]}</span> {t("shared_loading")}
      </span>
    );
  }
  if (item.status === "unreadable") {
    return (
      <span class="chip chip--unreadable">
        <Icon name="lock" />
        {item.title}
      </span>
    );
  }
  return (
    <span class={cx("chip", item.included ? "sent" : "chip--off")}>
      <button type="button" class="chip__main" aria-pressed={item.included} onClick={() => onToggle?.(item)}>
        <span class="kind">{KIND_MARK[item.kind]}</span>
        <span class="chip__title">{item.title}</span>
        <span>{formatChars(item.text.length)}</span>
      </button>
      {item.included && onRemove && (
        <button type="button" class="chip__x" aria-label={t("shared_removeFromContext")} onClick={() => onRemove(item)}>
          <Icon name="x" />
        </button>
      )}
    </span>
  );
}

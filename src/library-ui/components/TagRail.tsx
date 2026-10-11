import { t } from "../../shared/i18n";
import { Icon } from "../../shared/ui";

interface TagRailProps {
  tagCounts: ReadonlyMap<string, number>;
  total: number;
  activeTag: string | null;
  onSelect: (tag: string | null) => void;
}

function TagButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button type="button" class="btn btn--quiet btn--compact" aria-pressed={active} onClick={onClick}>
      {label}
    </button>
  );
}

export function TagRail({ tagCounts, total, activeTag, onSelect }: TagRailProps) {
  return (
    <nav class="lib__rail" aria-label={t("library_ui_filters")}>
      <p class="overline">{t("library_ui_tagsTitle")}</p>
      <ul class="stack">
        <li>
          <TagButton label={t("library_ui_allTags", { count: total })} active={activeTag === null} onClick={() => onSelect(null)} />
        </li>
        {[...tagCounts].map(([tag, count]) => (
          <li key={tag}>
            <TagButton label={`${tag} (${count})`} active={activeTag === tag} onClick={() => onSelect(tag)} />
          </li>
        ))}
      </ul>
      <span class="badge badge--local">
        <Icon name="lock" />
        {t("library_ui_localBadge")}
      </span>
    </nav>
  );
}

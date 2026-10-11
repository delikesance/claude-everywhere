import { t } from "../../shared/i18n";
import { Button, Icon, Notice } from "../../shared/ui";

export function ListSkeleton() {
  return (
    <div role="status" aria-busy="true">
      <p class="caption">{t("library_ui_loading")}</p>
      <ul class="stack" aria-hidden="true">
        {[0, 1, 2].map((row) => (
          <li class="lib__row" key={row}>
            <span class="pilcrow">¶</span>
            <div class="grow">
              <div class="ghost" />
              <div class="ghost" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function LoadError() {
  return <Notice tone="error" title={t("library_ui_loadError")} />;
}

export function EmptyLibrary() {
  return (
    <div class="sb-empty">
      <h2>{t("library_ui_emptyTitle")}</h2>
      <p class="caption">{t("library_ui_emptyHint")}</p>
      <span class="badge badge--local">
        <Icon name="lock" />
        {t("library_ui_localBadge")}
      </span>
    </div>
  );
}

export function NoResult({ query, onClear }: { query: string; onClear: () => void }) {
  return (
    <div class="sb-empty" role="status">
      <h2>{t("library_ui_noResultTitle", { query })}</h2>
      <p class="caption">{t("library_ui_noResultHint")}</p>
      <Button onClick={onClear}>{t("library_ui_clearSearch")}</Button>
    </div>
  );
}

export function NoTagged() {
  return (
    <div class="sb-empty" role="status">
      <p class="caption">{t("library_ui_noTagged")}</p>
    </div>
  );
}

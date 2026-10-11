import { t } from "../../shared/i18n";
import { Button, Notice } from "../../shared/ui";

export function ListSkeleton() {
  return (
    <div role="status" aria-busy="true">
      <p class="caption">{t("library_ui_loading")}</p>
      <ul class="toc" aria-hidden="true">
        {[0, 1, 2].map((row) => (
          <li class="lib__row" key={row}>
            <div class="ghost" />
            <div class="ghost" />
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

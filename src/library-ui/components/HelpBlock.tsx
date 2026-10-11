import { t } from "../../shared/i18n";

export function HelpBlock() {
  return (
    <details class="section">
      <summary>{t("library_ui_helpTitle")}</summary>
      <div class="stack">
        <p class="caption">{t("library_ui_helpNoApi")}</p>
        <ul class="stack">
          <li class="caption">{t("library_ui_helpClaudeProject")}</li>
          <li class="caption">{t("library_ui_helpClaudeCode")}</li>
          <li class="caption">{t("library_ui_helpClipboard")}</li>
        </ul>
      </div>
    </details>
  );
}

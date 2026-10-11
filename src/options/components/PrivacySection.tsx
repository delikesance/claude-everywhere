import { t } from "../../shared/i18n";

export function PrivacySection() {
  return (
    <div class="stack reading">
      <p>{t("options_privacySent")}</p>
      <p>{t("options_privacyDestination")}</p>
      <p>{t("options_privacyTiming")}</p>
      <p>{t("options_privacyStored")}</p>
    </div>
  );
}

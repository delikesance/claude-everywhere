import { t } from "../../shared/i18n";
import { Notice } from "../../shared/ui";

export function ProtectedNotice() {
  return <Notice icon="lock">{t("sidebar_protectedBody")}</Notice>;
}

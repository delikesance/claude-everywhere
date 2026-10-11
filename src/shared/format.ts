import { t } from "./i18n";

export function formatChars(count: number): string {
  return t("shared_charsUnit", { count: count.toLocaleString("fr-FR") });
}

import { formatNumber } from "../../shared/format";
import { t } from "../../shared/i18n";
import { Notice } from "../../shared/ui";
import { truncatedLine } from "../state/plan";

export function LongDocumentNotice() {
  const line = truncatedLine.value;
  if (!line) return null;
  const counts = { sent: formatNumber(line.sentChars), total: formatNumber(line.totalChars) };
  return <Notice tone="warning">{t("sidebar_longDocBody", counts)}</Notice>;
}

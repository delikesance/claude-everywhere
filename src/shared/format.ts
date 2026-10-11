import { t, uiLocale } from "./i18n";

const DATE_FORMAT: Intl.DateTimeFormatOptions = { day: "numeric", month: "long" };
const DATE_TIME_FORMAT: Intl.DateTimeFormatOptions = { dateStyle: "medium", timeStyle: "short" };

export const formatNumber = (value: number): string => value.toLocaleString(uiLocale());

export const formatChars = (count: number): string => t("shared_charsUnit", { count: formatNumber(count) });

export const formatDate = (value: number | Date): string => new Date(value).toLocaleDateString(uiLocale(), DATE_FORMAT);

export const formatDateTime = (value: number | Date): string =>
  new Date(value).toLocaleString(uiLocale(), DATE_TIME_FORMAT);

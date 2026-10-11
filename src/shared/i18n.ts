import type { MessageKey } from "./generated/message-keys";
import type { UiLocale } from "./types";

export type { MessageKey };
export type Catalog = Record<string, string>;

const FALLBACK_LOCALE: UiLocale = "fr";

let currentLocale: UiLocale = FALLBACK_LOCALE;
let current: Catalog = {};
let fallback: Catalog = {};

export const uiLocale = (): UiLocale => currentLocale;

export function resolveLocale(locale: UiLocale | "auto"): UiLocale {
  if (locale !== "auto") return locale;
  return browser.i18n.getUILanguage().toLowerCase().startsWith("fr") ? "fr" : "en";
}

async function loadCatalog(locale: UiLocale): Promise<Catalog> {
  const response = await fetch(browser.runtime.getURL(`locales/${locale}.json`));
  return (await response.json()) as Catalog;
}

export async function initI18n(locale: UiLocale | "auto", catalog?: Catalog): Promise<void> {
  const resolved = resolveLocale(locale);
  currentLocale = resolved;
  current = catalog ?? (await loadCatalog(resolved));
  fallback = resolved === FALLBACK_LOCALE ? current : await loadCatalog(FALLBACK_LOCALE);
}

export function t(key: MessageKey, params: Record<string, string | number> = {}): string {
  const template = current[key] ?? fallback[key] ?? key;
  return template.replace(/\{(\w+)\}/g, (placeholder, name: string) =>
    name in params ? String(params[name]) : placeholder,
  );
}

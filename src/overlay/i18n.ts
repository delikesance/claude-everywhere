import { initI18n, resolveLocale } from "../shared/i18n";
import type { Catalog } from "../shared/i18n";
import sharedEn from "../shared/locales/en.json";
import sharedFr from "../shared/locales/fr.json";
import type { UiLocale } from "../shared/types";
import overlayEn from "./locales/en.json";
import overlayFr from "./locales/fr.json";

const CATALOGS: Record<UiLocale, Catalog> = {
  fr: { ...sharedFr, ...overlayFr },
  en: { ...sharedEn, ...overlayEn },
};

// Content scripts cannot fetch the extension's locale files, so the catalogs ship inside the bundle.
// Passing "fr" with a ready catalog keeps the shared loader from fetching a fallback.
export function initOverlayI18n(locale: UiLocale | "auto"): Promise<void> {
  return initI18n("fr", CATALOGS[resolveLocale(locale)]);
}

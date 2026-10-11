import type { ComponentChild } from "preact";
import { render } from "preact";
import { initI18n, resolveLocale } from "../shared/i18n";
import { getSettings } from "../shared/settings";
import { applyTheme } from "../shared/theme";

export async function bootPage(page: ComponentChild): Promise<void> {
  const settings = await getSettings();
  await initI18n(settings.uiLocale);
  document.documentElement.lang = resolveLocale(settings.uiLocale);
  applyTheme(settings.theme);
  render(page, document.getElementById("root")!);
}

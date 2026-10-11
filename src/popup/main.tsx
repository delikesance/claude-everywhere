import { render } from "preact";
import { initI18n } from "../shared/i18n";
import { getSettings } from "../shared/settings";
import { applyTheme } from "../shared/theme";
import { App } from "./App";

async function start(): Promise<void> {
  const settings = await getSettings();
  applyTheme(settings.theme);
  await initI18n(settings.uiLocale);
  render(<App />, document.getElementById("root")!);
}

void start();

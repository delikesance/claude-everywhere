import { render } from "preact";
import { initI18n, resolveLocale } from "../shared/i18n";
import { App } from "./App";
import { intakeOnOpen, watchIntake } from "./state/intake";
import { loadSettings, settings, watchSettings } from "./state/session";
import { resetConversation } from "./state/conversation";
import { watchTabChanges } from "./state/tabWatch";

async function main(): Promise<void> {
  await loadSettings();
  await initI18n(settings.value.uiLocale);
  document.documentElement.lang = resolveLocale(settings.value.uiLocale);
  resetConversation();
  watchSettings();
  watchIntake();
  watchTabChanges();
  render(<App />, document.getElementById("root")!);
  await intakeOnOpen();
}

void main();

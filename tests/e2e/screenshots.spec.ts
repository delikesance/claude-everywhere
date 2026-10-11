import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, beforeAll, it } from "vitest";
import { startHarness } from "./harness";
import type { Harness } from "./harness";
import { setTheme, startSession, storeApiKey } from "./session";
import { ask, waitForDone } from "./sidebar";
import { closeOtherTabs, find, openExtensionPage, runInPage } from "./ui";

let harness: Harness;

const SCREENSHOTS_DIR = join(import.meta.dirname, "../../docs/screenshots");
const UPDATE_SCREENSHOTS = process.env["UPDATE_SCREENSHOTS"] === "1";
const THEMES = ["light", "dark"] as const;
const SAMPLE_NOTE = { title: "Lire dans la marge", url: null, sourceType: "note", tags: ["lecture"], markdown: "Annoter un texte en marge est une habitude ancienne." };

beforeAll(async () => {
  harness = await startHarness();
  await startSession(harness);
  await storeApiKey(harness);
  await runInPage(harness.driver, `await browser.runtime.sendMessage({ type: "artifact/save", draft: arguments[0] });`, SAMPLE_NOTE);
  if (UPDATE_SCREENSHOTS) mkdirSync(SCREENSHOTS_DIR, { recursive: true });
});
afterAll(() => harness.close());

async function shoot(name: string, theme: string): Promise<void> {
  if (!UPDATE_SCREENSHOTS) return;
  const png = await harness.driver.takeScreenshot();
  writeFileSync(join(SCREENSHOTS_DIR, `${name}-${theme}.png`), png, "base64");
}

async function showPage(page: string, readySelector: string): Promise<void> {
  await closeOtherTabs(harness.driver);
  await openExtensionPage(harness, page, readySelector);
}

for (const theme of THEMES) {
  it(`captures every surface in the ${theme} theme`, async () => {
    await setTheme(harness, theme);

    await showPage("options.html", "[role=switch]");
    await find(harness.driver, `html[data-theme=${theme}]`);
    await shoot("options", theme);

    await showPage("popup.html", "button");
    await shoot("popup", theme);

    await showPage("library-ui.html", ".row-title a");
    await shoot("library", theme);

    await showPage("sidebar.html", "textarea");
    await ask(harness, "Explique-moi la lecture en marge.");
    await waitForDone(harness);
    await shoot("sidebar", theme);
  });
}

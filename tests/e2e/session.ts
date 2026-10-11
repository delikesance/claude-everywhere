import { By } from "selenium-webdriver";
import { API_KEY } from "./harness";
import type { Harness } from "./harness";
import { closeOtherTabs, find, findByText, openExtensionPage, patchStoredSettings, runInPage, t } from "./ui";

const OPTIONS_READY = "#api-key";
const SWITCH = "[role=switch]";

export async function reloadOptions(harness: Harness): Promise<void> {
  await harness.driver.navigate().refresh();
  await findByText(harness.driver, "h1", t("options_pageTitle"));
}

/** Starts from a single extension tab with the French interface, so every spec reads the same catalog. */
export async function startSession(harness: Harness): Promise<void> {
  const { driver } = harness;
  await closeOtherTabs(driver);
  await driver.get(harness.extension("options.html"));
  await find(driver, OPTIONS_READY);
  await patchStoredSettings(driver, { uiLocale: "fr" });
  await reloadOptions(harness);
}

export async function submitKey(harness: Harness, key: string): Promise<void> {
  const { driver } = harness;
  await driver.findElement(By.css(OPTIONS_READY)).sendKeys(key);
  await driver.findElement(By.css("form button[type=submit]")).click();
}

export async function storeApiKey(harness: Harness, key = API_KEY): Promise<void> {
  await submitKey(harness, key);
  await findByText(harness.driver, "[role=status]", t("options_keyValid"));
}

/** Turning on the floating bar asks for the all-sites permission, which the test profile grants without a prompt. */
export async function enableAllSites(harness: Harness): Promise<void> {
  const { driver } = harness;
  await (await driver.findElement(By.css("details.advanced summary"))).click();
  const [overlaySwitch] = await driver.findElements(By.css(SWITCH));
  await overlaySwitch?.click();
  await driver.wait(
    async () => (await runInPage<string>(driver, `return JSON.stringify(await browser.permissions.getAll());`)).includes("<all_urls>"),
    10_000,
  );
}

export async function setTheme(harness: Harness, theme: "light" | "dark"): Promise<void> {
  await runInPage(harness.driver, `await browser.storage.local.set({ settings: { ...(await browser.storage.local.get("settings")).settings, theme: arguments[0] } });`, theme);
}

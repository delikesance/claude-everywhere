import { readFileSync } from "node:fs";
import { join } from "node:path";
import { By, until } from "selenium-webdriver";
import type { WebDriver, WebElement } from "selenium-webdriver";
import type { Harness } from "./harness";

const WAIT_MS = 10_000;
const FRENCH = JSON.parse(readFileSync(join(import.meta.dirname, "../../dist-test/locales/fr.json"), "utf8")) as Record<string, string>;

/** French catalog lookup so the specs read the same strings the UI renders. */
export function t(key: string, params: Record<string, string | number> = {}): string {
  return (FRENCH[key] ?? key).replace(/\{(\w+)\}/g, (_, name: string) => String(params[name]));
}

export function find(driver: WebDriver, css: string, timeout = WAIT_MS): Promise<WebElement> {
  return driver.wait(until.elementLocated(By.css(css)), timeout, `no element ${css}`);
}

export async function findByText(driver: WebDriver, css: string, text: string, timeout = WAIT_MS): Promise<WebElement> {
  const matches = async () => {
    for (const element of await driver.findElements(By.css(css))) {
      if (((await element.getAttribute("textContent")) ?? "").includes(text)) return element;
    }
    return null;
  };
  return driver.wait(matches as () => Promise<WebElement>, timeout, `no ${css} containing "${text}"`);
}

export async function bodyText(driver: WebDriver): Promise<string> {
  return driver.findElement(By.css("body")).getText();
}

/** Clicks through script so it also works while the tab is not the selected one. */
export async function jsClick(driver: WebDriver, element: WebElement): Promise<void> {
  await driver.executeScript("arguments[0].click()", element);
}

export async function runInPage<T>(driver: WebDriver, body: string, ...args: unknown[]): Promise<T> {
  const script = `const done = arguments[arguments.length - 1]; (async () => { ${body} })().then(done, (e) => done({ __error: String(e) }));`;
  const result = await driver.executeAsyncScript<T | { __error: string }>(script, ...args);
  if (typeof result === "object" && result !== null && "__error" in result) throw new Error(String(result.__error));
  return result as T;
}

export async function patchStoredSettings(driver: WebDriver, patch: Record<string, unknown>): Promise<void> {
  await runInPage(
    driver,
    `const { settings = {} } = await browser.storage.local.get("settings");
     await browser.storage.local.set({ settings: { ...settings, ...arguments[0] } });`,
    patch,
  );
}

export async function openTab(driver: WebDriver, url: string): Promise<string> {
  await driver.switchTo().newWindow("tab");
  await driver.get(url);
  return driver.getWindowHandle();
}

export async function closeOtherTabs(driver: WebDriver): Promise<void> {
  const [keep, ...others] = await driver.getAllWindowHandles();
  for (const handle of others) {
    await driver.switchTo().window(handle);
    await driver.close();
  }
  await driver.switchTo().window(keep as string);
}

/** The page of `harness.extension(page)` in a fresh tab, once its root has rendered. */
export async function openExtensionPage(harness: Harness, page: string, readySelector: string): Promise<string> {
  const handle = await openTab(harness.driver, harness.extension(page));
  await find(harness.driver, readySelector);
  return handle;
}

/** Id of the one non-extension tab; its URL is unreadable to the extension for privileged pages. */
export function pageTabId(driver: WebDriver): Promise<number> {
  return runInPage<number>(
    driver,
    `const own = (await browser.tabs.getCurrent()).id;
     return (await browser.tabs.query({})).find((tab) => tab.id !== own && !tab.url?.startsWith("moz-extension://")).id;`,
  );
}

export async function selectTab(driver: WebDriver, tabId: number): Promise<void> {
  await runInPage(driver, `await browser.tabs.update(arguments[0], { active: true });`, tabId);
}

export function ownTabId(driver: WebDriver): Promise<number> {
  return runInPage<number>(driver, `return (await browser.tabs.getCurrent()).id;`);
}

/** Runs `action` while the page tab is the browser's active tab, as it is when the real sidebar is open beside it. */
export async function whilePageIsActive(driver: WebDriver, pageTabId: number, action: () => Promise<void>): Promise<void> {
  const own = await ownTabId(driver);
  await selectTab(driver, pageTabId);
  try {
    await action();
  } finally {
    await selectTab(driver, own);
  }
}

/** Polls a script expression; works in a tab that is not selected, where WebDriver text queries are empty. */
export function waitForScript(driver: WebDriver, expression: string, ...args: unknown[]): Promise<unknown> {
  return driver.wait(() => driver.executeScript(`return ${expression}`, ...args), WAIT_MS, `condition never held: ${expression}`);
}

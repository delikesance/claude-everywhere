import { By } from "selenium-webdriver";
import type { WebElement } from "selenium-webdriver";
import type { Harness } from "./harness";
import { find, findByText, jsClick, openExtensionPage, openTab, pageTabId, t, waitForScript, whilePageIsActive } from "./ui";

const COMPOSER = "textarea";
const ANSWER = ".md";
const MENU_TRIGGER = 'button[aria-haspopup="menu"]';

export interface PageUnderTest {
  url: string;
  tabId: number;
}

/** Opens `url` in a tab (after `preparePage`) and the sidebar beside it; the sidebar tab is left selected. */
export async function openSidebarBeside(harness: Harness, url: string, preparePage?: () => Promise<void>): Promise<PageUnderTest> {
  await openTab(harness.driver, url);
  await preparePage?.();
  await openExtensionPage(harness, "sidebar.html", COMPOSER);
  return { url, tabId: await pageTabId(harness.driver) };
}

/** The "add page" and "add selection" menu items read the browser's active tab, so the page tab is made active around the click. */
export async function addFromPage(harness: Harness, page: PageUnderTest, buttonLabel: string, settled = ".sb-chips .chip__title"): Promise<void> {
  const { driver } = harness;
  await jsClick(driver, await find(driver, MENU_TRIGGER));
  const item = await findByText(driver, "[role=menuitem]", buttonLabel);
  await whilePageIsActive(driver, page.tabId, async () => {
    await jsClick(driver, item);
    await waitForScript(driver, `document.querySelector(arguments[0])`, settled);
  });
  await find(driver, settled);
}

export async function ask(harness: Harness, question: string): Promise<void> {
  const { driver } = harness;
  await driver.findElement(By.css(COMPOSER)).sendKeys(question);
  await (await find(driver, `button[aria-label="${t("sidebar_send")}"]`)).click();
}

export async function answerText(harness: Harness): Promise<string> {
  const answers = await harness.driver.findElements(By.css(ANSWER));
  return answers.length === 0 ? "" : (answers[answers.length - 1] as WebElement).getText();
}

export async function waitForDone(harness: Harness): Promise<void> {
  await findByText(harness.driver, "[role=status]", t("sidebar_statusDone", { model: "" }).split(" ·")[0] as string);
}

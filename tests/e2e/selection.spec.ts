import { By, until } from "selenium-webdriver";
import type { WebDriver, WebElement } from "selenium-webdriver";
import { afterAll, beforeAll, beforeEach, expect, it } from "vitest";
import { API_KEY, startHarness } from "./harness";
import type { Harness } from "./harness";
import { enableAllSites, startSession, storeApiKey } from "./session";
import { addFromPage, ask, openSidebarBeside, waitForDone } from "./sidebar";
import { closeOtherTabs, openTab, t } from "./ui";

let harness: Harness;

const SELECTED = "Annoter un texte en marge est une habitude ancienne";
const OTHER_ARTICLE_TEXT = "Souligner la phrase qui porte l'idée";

const sentBody = () => JSON.stringify(harness.mock.requests.at(-1)?.body);

beforeAll(async () => {
  harness = await startHarness();
  await startSession(harness);
  await storeApiKey(harness);
  await enableAllSites(harness);
});
afterAll(() => harness.close());

beforeEach(async () => {
  await closeOtherTabs(harness.driver);
  harness.resetMock();
});

async function selectArticleIntro(driver: WebDriver): Promise<void> {
  await driver.executeScript(`
    const paragraph = [...document.querySelectorAll("article p")].find((p) => p.textContent.includes(arguments[0]));
    getSelection().selectAllChildren(paragraph);
    document.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
  `, SELECTED);
}

async function overlayRoot(driver: WebDriver): Promise<WebElement> {
  const host = await driver.wait(until.elementLocated(By.css("claude-everywhere-overlay")), 10_000);
  return host.getShadowRoot() as unknown as Promise<WebElement>;
}

it("explains the selection from the floating bar and sends only the selection", async () => {
  const { driver } = harness;
  await openTab(driver, harness.fixture("article.html"));
  await driver.sleep(500);
  await selectArticleIntro(driver);

  const root = await overlayRoot(driver);
  await driver.wait(async () => (await root.findElements(By.css("[role=toolbar] button"))).length > 0, 10_000);
  const explain = await root.findElement(By.css("[role=toolbar] button"));
  expect(await explain.getText()).toBe(t("overlay_explain"));
  expect(harness.mock.requests).toEqual([]);
  await explain.click();

  const dialog = await root.findElement(By.css("[role=dialog]"));
  expect(await dialog.getText()).toContain(SELECTED);
  expect(harness.mock.requests).toEqual([]);
  const cardButtons = await dialog.findElements(By.css("button"));
  const send = await Promise.all(cardButtons.map(async (button) => ((await button.getText()) === t("overlay_explain") ? button : null)));
  await send.find((button) => button !== null)?.click();

  await driver.wait(async () => (await (await root.findElement(By.css("[role=dialog]"))).getText()).includes("serveur factice"), 10_000);
  expect(harness.mock.requests).toHaveLength(1);
  expect(harness.mock.requests[0]?.headers["x-api-key"]).toBe(API_KEY);
  expect(sentBody()).toContain(SELECTED);
  expect(sentBody()).not.toContain(OTHER_ARTICLE_TEXT);
  expect(sentBody()).not.toContain("NAV_ACCUEIL");
});

it("adds the selection to the sidebar and sends only the selection", async () => {
  const page = await openSidebarBeside(harness, harness.fixture("article.html"), () => selectArticleIntro(harness.driver));

  await addFromPage(harness, page, t("sidebar_addSelection"));
  await ask(harness, "Explique ce passage.");
  await waitForDone(harness);

  expect(harness.mock.requests).toHaveLength(1);
  expect(sentBody()).toContain(SELECTED);
  expect(sentBody()).not.toContain(OTHER_ARTICLE_TEXT);
});

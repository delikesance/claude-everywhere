import { By } from "selenium-webdriver";
import type { WebDriver } from "selenium-webdriver";
import { afterAll, beforeAll, beforeEach, expect, it } from "vitest";
import { startHarness } from "./harness";
import type { Harness } from "./harness";
import { enableAllSites, startSession, storeApiKey } from "./session";
import { closeOtherTabs, openExtensionPage, openTab, pageTabId, runInPage } from "./ui";

let harness: Harness;
let optionsTab: string;

const ARTICLE_TITLE = "Lire dans la marge";

/** The toolbar click hands the active page over with this message; the test passes the tab id the click would pass. */
const CLICK_HANDOFF = { type: "capture/run", mode: "page", handoff: true };

const send = (message: object) =>
  runInPage<{ ok: boolean; value?: Record<string, unknown>; error?: { kind: string } }>(
    harness.driver,
    `return await browser.runtime.sendMessage(arguments[0]);`,
    message,
  );

/** Tab id of the most recently opened tab, which is the one `openTab` just created. */
const newestTabId = (driver: WebDriver) =>
  runInPage<number>(
    driver,
    `const own = (await browser.tabs.getCurrent()).id;
     return (await browser.tabs.query({})).filter((tab) => tab.id !== own).at(-1).id;`,
  );

beforeAll(async () => {
  harness = await startHarness();
  await startSession(harness);
  await storeApiKey(harness);
  await enableAllSites(harness);
});
afterAll(() => harness.close());

beforeEach(async () => {
  await closeOtherTabs(harness.driver);
  await harness.driver.get(harness.extension("options.html"));
  optionsTab = await harness.driver.getWindowHandle();
  harness.resetMock();
});

it("hands the clicked page to the sidebar as a pending capture and clears it once read", async () => {
  const { driver } = harness;
  await openTab(driver, harness.fixture("article.html"));
  await driver.switchTo().window(optionsTab);
  const tabId = await pageTabId(driver);

  expect(await send({ ...CLICK_HANDOFF, tabId })).toMatchObject({ ok: true, value: { title: ARTICLE_TITLE } });
  await openExtensionPage(harness, "sidebar.html", "textarea");
  await driver.wait(async () => (await driver.findElements(By.css(".sb-chips .chip__title"))).length > 0, 10_000);
  expect(await (await driver.findElement(By.css(".sb-chips .chip__title"))).getText()).toBe(ARTICLE_TITLE);
  expect(await driver.executeScript("return document.activeElement?.tagName")).toBe("TEXTAREA");
  expect(await send({ type: "capture/takePending" })).toEqual({ ok: true, value: null });
});

it("stores no pending capture for a restricted page and reports it as protected", async () => {
  const { driver } = harness;
  await openTab(driver, "about:addons");
  await driver.switchTo().window(optionsTab);
  const tabId = await newestTabId(driver);

  expect(await send({ ...CLICK_HANDOFF, tabId })).toMatchObject({ ok: false, error: { kind: "restricted" } });
  expect(await send({ type: "capture/takePending" })).toEqual({ ok: true, value: null });
});

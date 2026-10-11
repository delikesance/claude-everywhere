import { By, Key } from "selenium-webdriver";
import { afterAll, beforeAll, beforeEach, expect, it } from "vitest";
import { MODEL_IDS } from "../../src/shared/constants";
import { startHarness } from "./harness";
import type { Harness } from "./harness";
import { enableAllSites, startSession, storeApiKey } from "./session";
import { addFromPage, ask, openSidebarBeside, waitForDone } from "./sidebar";
import type { PageUnderTest } from "./sidebar";
import { closeOtherTabs, find, runInPage, t, waitForScript } from "./ui";

let harness: Harness;
let page: PageUnderTest;

const MENU_TRIGGER = 'button[aria-haspopup="menu"]';
const SEND_BUTTON = `button[aria-label="${t("sidebar_send")}"]`;
const apiRequests = () => harness.mock.requests.filter((request) => request.url.startsWith("/v1/messages"));
const sentUserText = () => JSON.stringify(apiRequests()[0]?.body);
const textOf = async (css: string) => (await find(harness.driver, css)).getAttribute("textContent");
const pillText = () => textOf(".sb-pill");
const activeText = () =>
  runInPage<string>(harness.driver, `return document.activeElement?.textContent?.trim() ?? "";`);
const activeLabel = () =>
  runInPage<string>(harness.driver, `return document.activeElement?.getAttribute("aria-label") ?? "";`);
const modelRadios = () => harness.driver.findElements(By.css('[role="menuitemradio"]'));

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

async function sidebarWithArticle(addPage = true): Promise<void> {
  page = await openSidebarBeside(harness, harness.fixture("article.html"));
  if (addPage) await addFromPage(harness, page, t("sidebar_addPage"));
}

async function openMenu(): Promise<void> {
  await (await find(harness.driver, MENU_TRIGGER)).click();
  await find(harness.driver, '[role="menu"]');
  await waitForScript(harness.driver, `document.activeElement?.getAttribute("role") === "menuitem"`);
}

async function pressInMenu(...keys: string[]): Promise<void> {
  await harness.driver.switchTo().activeElement().sendKeys(...keys);
}

it("shows an empty pill before any context is added", async () => {
  await sidebarWithArticle(false);
  expect(await pillText()).toBe(t("sidebar_slipEmpty"));
});

it("names the added page in the pill and toggles the detail slip", async () => {
  await sidebarWithArticle();
  expect(await pillText()).toMatch(/^Part : \S/);

  const toggle = await find(harness.driver, ".slip__toggle");
  expect(await toggle.getAttribute("aria-expanded")).toBe("false");
  await toggle.click();
  expect(await toggle.getAttribute("aria-expanded")).toBe("true");
  expect(await (await find(harness.driver, ".slip__body")).getAttribute("data-open")).toBe("true");
  expect(await textOf(".slip__inner")).toContain(t("sidebar_slipDestination"));
  await toggle.click();
  expect(await (await find(harness.driver, ".slip__body")).getAttribute("data-open")).toBe("false");
});

it("keeps send disabled until the draft has text", async () => {
  await sidebarWithArticle(false);
  expect(await (await find(harness.driver, SEND_BUTTON)).getAttribute("aria-disabled")).toBe("true");
  await (await find(harness.driver, "textarea")).sendKeys("Bonjour");
  expect(await (await find(harness.driver, SEND_BUTTON)).getAttribute("aria-disabled")).toBe("false");
});

it("sends on Enter and keeps Shift+Enter as a line break", async () => {
  await sidebarWithArticle();
  const field = await find(harness.driver, "textarea");
  await field.sendKeys("Première ligne");
  await harness.driver.actions().keyDown(Key.SHIFT).sendKeys(Key.ENTER).keyUp(Key.SHIFT).perform();
  await field.sendKeys("Seconde ligne");
  expect(await field.getAttribute("value")).toBe("Première ligne\nSeconde ligne");
  expect(harness.mock.requests).toEqual([]);

  await field.sendKeys(Key.ENTER);
  await waitForDone(harness);
  expect(apiRequests()).toHaveLength(1);
  expect(sentUserText()).toContain("Première ligne\\nSeconde ligne");
});

it("closes the menu on Escape and gives focus back to the plus button", async () => {
  await sidebarWithArticle(false);
  await openMenu();
  await pressInMenu(Key.ESCAPE);
  expect(await harness.driver.findElements(By.css('[role="menu"]'))).toHaveLength(0);
  expect(await activeLabel()).toBe(t("sidebar_addContext"));
});

it("moves focus through the menu with the arrow keys and wraps at both ends", async () => {
  await sidebarWithArticle(false);
  await openMenu();
  expect(await activeText()).toBe(t("sidebar_addPage"));
  await pressInMenu(Key.ARROW_DOWN);
  expect(await activeText()).toBe(t("sidebar_addSelection"));
  await pressInMenu(Key.ARROW_UP, Key.ARROW_UP);
  expect(await activeText()).toBe(t("sidebar_settings"));
  await pressInMenu(Key.ESCAPE);
});

it("sends the model picked in the menu and keeps the choice", async () => {
  await sidebarWithArticle();
  const [, sonnet] = MODEL_IDS;
  await openMenu();
  await (await modelRadios())[1]?.click();
  expect(await harness.driver.findElements(By.css('[role="menu"]'))).toHaveLength(0);

  await openMenu();
  expect(await (await modelRadios())[1]?.getAttribute("aria-checked")).toBe("true");
  await pressInMenu(Key.ESCAPE);

  await ask(harness, "Question");
  await waitForDone(harness);
  expect((apiRequests()[0]?.body as { model?: string } | null)?.model).toBe(sonnet);
});

it("excludes a chip on click and removes it with its cross", async () => {
  await sidebarWithArticle();
  await (await find(harness.driver, ".chip__main")).click();
  expect(await (await find(harness.driver, ".chip__main")).getAttribute("aria-pressed")).toBe("false");
  expect(await harness.driver.findElements(By.css(".chip__x"))).toHaveLength(0);

  await (await find(harness.driver, ".chip__main")).click();
  expect(await (await find(harness.driver, ".sb-chips .caption")).getText()).toMatch(/envoyés \/ .+ au total/);
  await (await find(harness.driver, ".chip__x")).click();
  expect(await harness.driver.findElements(By.css(".chip__title"))).toHaveLength(0);
});

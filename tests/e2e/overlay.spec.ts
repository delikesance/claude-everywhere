import { By, Key, until } from "selenium-webdriver";
import type { WebDriver, WebElement } from "selenium-webdriver";
import { afterAll, beforeAll, beforeEach, expect, it } from "vitest";
import { API_KEY, startHarness } from "./harness";
import type { Harness } from "./harness";
import { enableAllSites, startSession, storeApiKey } from "./session";
import { ask, openSidebarBeside, waitForDone } from "./sidebar";
import { closeOtherTabs, openExtensionPage, openTab, patchStoredSettings, t } from "./ui";

let harness: Harness;
let optionsTab: string;

const SELECTED = "Annoter un texte en marge est une habitude ancienne";
const OTHER_ARTICLE_TEXT = "Souligner la phrase qui porte l'idée";
const ANSWER_MARKER = "serveur factice";
const LONG_TOP = "En haut de page";
const LONG_BOTTOM = "En bas de page";
const LONG_RIGHT = "Une phrase étroite";

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
  await harness.driver.get(harness.extension("options.html"));
  optionsTab = await harness.driver.getWindowHandle();
  harness.resetMock();
});

/** Selects the page paragraph containing `text`, scrolled to `block`, as a real selection that the overlay reads. */
async function selectParagraph(driver: WebDriver, text: string, block: ScrollLogicalPosition = "center"): Promise<void> {
  await overlayRoot(driver);
  await driver.executeScript(
    `const paragraph = [...document.querySelectorAll("p")].find((p) => p.textContent.includes(arguments[0]));
     paragraph.scrollIntoView({ block: arguments[1] });
     const range = document.createRange();
     range.selectNodeContents(paragraph);
     getSelection().removeAllRanges();
     getSelection().addRange(range);`,
    text,
    block,
  );
  await driver.actions().keyDown(Key.SHIFT).keyUp(Key.SHIFT).perform();
}

async function overlayRoot(driver: WebDriver): Promise<WebElement> {
  const host = await driver.wait(until.elementLocated(By.css("claude-everywhere-overlay")), 10_000);
  return host.getShadowRoot() as unknown as Promise<WebElement>;
}

async function toolbarButton(driver: WebDriver): Promise<WebElement> {
  const root = await overlayRoot(driver);
  await driver.wait(async () => (await root.findElements(By.css("[role=toolbar] button"))).length > 0, 10_000);
  return root.findElement(By.css("[role=toolbar] button"));
}

async function dialogCount(driver: WebDriver): Promise<number> {
  return (await (await overlayRoot(driver)).findElements(By.css("[role=dialog]"))).length;
}

async function openCard(driver: WebDriver): Promise<WebElement> {
  await (await toolbarButton(driver)).click();
  await driver.wait(async () => (await dialogCount(driver)) === 1, 10_000, "card did not open");
  return (await overlayRoot(driver)).findElement(By.css("[role=dialog]"));
}

async function buttonLabelled(dialog: WebElement, label: string): Promise<WebElement> {
  for (const button of await dialog.findElements(By.css("button"))) {
    if ((await button.getText()).trim() === label) return button;
  }
  throw new Error(`no button "${label}"`);
}

async function waitForAnswer(driver: WebDriver): Promise<void> {
  const root = await overlayRoot(driver);
  await driver.wait(async () => (await (await root.findElement(By.css("[role=dialog]"))).getText()).includes(ANSWER_MARKER), 10_000);
}

it("shows one Demander button over the selection", async () => {
  const { driver } = harness;
  await openTab(driver, harness.fixture("article.html"));
  await selectParagraph(driver, SELECTED);

  const root = await overlayRoot(driver);
  await driver.wait(async () => (await root.findElements(By.css("[role=toolbar] button"))).length > 0, 10_000);
  const buttons = await root.findElements(By.css("[role=toolbar] button"));
  expect(buttons).toHaveLength(1);
  expect(await buttons[0]?.getText()).toBe(t("overlay_ask"));
  expect(await (await root.findElement(By.css("[role=toolbar]"))).getAttribute("aria-label")).toBe(t("overlay_toolbarLabel"));
  expect(harness.mock.requests).toEqual([]);
});

it("answers the selection in a card that streams and sends only the selection", async () => {
  const { driver } = harness;
  await openTab(driver, harness.fixture("article.html"));
  await selectParagraph(driver, SELECTED);
  const dialog = await openCard(driver);

  expect(await dialog.getAttribute("class")).toContain("anim-pop");
  expect(await dialog.getText()).toContain("Part : cette sélection,");
  await waitForAnswer(driver);
  expect(harness.mock.requests).toHaveLength(1);
  expect(harness.mock.requests[0]?.headers["x-api-key"]).toBe(API_KEY);
  expect(sentBody()).toContain(SELECTED);
  expect(sentBody()).not.toContain(OTHER_ARTICLE_TEXT);
});

it("keeps the answer in the library with Garder and marks it Gardé", async () => {
  const { driver } = harness;
  await openTab(driver, harness.fixture("article.html"));
  await selectParagraph(driver, SELECTED);
  const dialog = await openCard(driver);
  await waitForAnswer(driver);

  const keep = await buttonLabelled(dialog, t("overlay_save"));
  await keep.click();
  await driver.wait(async () => (await keep.getText()).trim() === t("overlay_saved"), 10_000);
  expect(await keep.getAttribute("aria-pressed")).toBe("true");
});

it("copies the answer with Copier and reports Copié", async () => {
  const { driver } = harness;
  await openTab(driver, harness.fixture("article.html"));
  await selectParagraph(driver, SELECTED);
  const dialog = await openCard(driver);
  await waitForAnswer(driver);

  const copy = await buttonLabelled(dialog, t("overlay_copy"));
  await copy.click();
  await driver.wait(async () => (await copy.getText()).trim() === t("overlay_copied"), 10_000);
});

it("hands the selection to the sidebar with Continuer dans le panneau", async () => {
  const { driver } = harness;
  await openTab(driver, harness.fixture("article.html"));
  await selectParagraph(driver, SELECTED);
  const dialog = await openCard(driver);
  await waitForAnswer(driver);
  await (await buttonLabelled(dialog, t("overlay_panel"))).click();

  await openExtensionPage(harness, "sidebar.html", "textarea");
  await driver.wait(async () => (await driver.findElements(By.css(".sb-chips .chip__title"))).length > 0, 10_000);
  const chips = await driver.findElements(By.css(".sb-chips .chip__title"));
  expect(await chips[0]?.getText()).toBe("Lire dans la marge");
  await ask(harness, "Explique ce passage.");
  await waitForDone(harness);
  expect(sentBody()).toContain(SELECTED);
  expect(sentBody()).not.toContain(OTHER_ARTICLE_TEXT);
});

it("closes the card on Escape and on an outside click", async () => {
  const { driver } = harness;
  await openTab(driver, harness.fixture("article.html"));
  await selectParagraph(driver, SELECTED);
  await openCard(driver);
  await driver.actions().sendKeys(Key.ESCAPE).perform();
  await driver.wait(async () => (await dialogCount(driver)) === 0, 5_000, "card stayed open after Escape");

  await selectParagraph(driver, SELECTED);
  await openCard(driver);
  await driver.findElement(By.css("h2")).click();
  await driver.wait(async () => (await dialogCount(driver)) === 0, 5_000, "card stayed open after outside click");
});

it("opens the card from the keyboard on the focused Demander button", async () => {
  const { driver } = harness;
  await openTab(driver, harness.fixture("article.html"));
  await selectParagraph(driver, SELECTED);
  const button = await toolbarButton(driver);
  await button.sendKeys(Key.ENTER);
  await driver.wait(async () => (await dialogCount(driver)) === 1, 5_000, "Enter did not open the card");
});

it("keeps the card inside the viewport at the top, bottom and right edges", async () => {
  const { driver } = harness;
  await openTab(driver, harness.fixture("overlay-long.html"));
  // WebDriver rects are page-relative, so the scroll offset is removed to compare with the viewport.
  const viewport = () =>
    driver.executeScript<{ width: number; height: number; scrollX: number; scrollY: number }>(
      "return { width: innerWidth, height: innerHeight, scrollX, scrollY };",
    );

  for (const [text, block] of [
    [LONG_TOP, "start"],
    [LONG_BOTTOM, "end"],
    [LONG_RIGHT, "center"],
  ] as const) {
    await selectParagraph(driver, text, block);
    const dialog = await openCard(driver);
    const rect = await dialog.getRect();
    const { width, height, scrollX, scrollY } = await viewport();
    const top = rect.y - scrollY;
    const left = rect.x - scrollX;
    expect(top, `${text} top`).toBeGreaterThanOrEqual(0);
    expect(left, `${text} left`).toBeGreaterThanOrEqual(0);
    expect(top + rect.height, `${text} bottom in ${height}`).toBeLessThanOrEqual(height);
    expect(left + rect.width, `${text} right in ${width}`).toBeLessThanOrEqual(width);
    await driver.actions().sendKeys(Key.ESCAPE).perform();
    await driver.wait(async () => (await dialogCount(driver)) === 0, 5_000);
  }
});

it("shows the no-key notice with an action that opens the panel", async () => {
  const { driver } = harness;
  await driver.switchTo().window(optionsTab);
  await patchStoredSettings(driver, { apiKey: null });
  try {
    await openTab(driver, harness.fixture("article.html"));
    await selectParagraph(driver, SELECTED);
    const dialog = await openCard(driver);
    expect(await dialog.getText()).toContain(t("overlay_noKeyTitle"));
    expect(harness.mock.requests).toEqual([]);
    expect(await (await buttonLabelled(dialog, t("overlay_openPanel"))).isDisplayed()).toBe(true);
  } finally {
    await driver.switchTo().window(optionsTab);
    await patchStoredSettings(driver, { apiKey: API_KEY });
  }
});

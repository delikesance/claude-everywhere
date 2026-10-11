import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { By } from "selenium-webdriver";
import { afterAll, beforeAll, expect, it } from "vitest";
import { startHarness } from "./harness";
import type { Harness } from "./harness";
import { enableAllSites, startSession, storeApiKey } from "./session";
import { ask, waitForDone } from "./sidebar";
import { find, findByText, openExtensionPage, runInPage, t } from "./ui";

let harness: Harness;

const ARTICLE_TITLE = "Lire dans la marge";
const ARTICLE_TEXT = "Annoter un texte en marge est une habitude ancienne";

beforeAll(async () => {
  harness = await startHarness();
  await startSession(harness);
  await storeApiKey(harness);
  await enableAllSites(harness);
});
afterAll(() => harness.close());

async function downloadedMatching(matches: (name: string) => boolean): Promise<string> {
  await harness.driver.wait(() => readdirSync(harness.downloadsDir).some(matches), 10_000, "no matching download");
  return readdirSync(harness.downloadsDir).find(matches) as string;
}

async function downloaded(filename: string): Promise<string> {
  await downloadedMatching((name) => name === filename);
  return readFileSync(join(harness.downloadsDir, filename), "utf8");
}

async function savePage(): Promise<void> {
  const draft = { title: ARTICLE_TITLE, url: null, sourceType: "note", tags: [], markdown: ARTICLE_TEXT };
  await runInPage(harness.driver, `await browser.runtime.sendMessage({ type: "artifact/save", draft: arguments[0] });`, draft);
}

it("saves a page, finds it by search, attaches it to a new conversation, and exports it", async () => {
  const { driver } = harness;
  await savePage();
  const sidebar = await openExtensionPage(harness, "sidebar.html", "textarea");
  const library = await openExtensionPage(harness, "library-ui.html", ".lib");

  await findByText(driver, ".row-title a", ARTICLE_TITLE);
  await (await find(driver, "input[type=search]")).sendKeys("habitude");
  const hit = await find(driver, "mark.hit");
  expect(await hit.getText()).toBe("habitude");

  await (await findByText(driver, ".row-title a", ARTICLE_TITLE)).click();
  await findByText(driver, "button", t("library_ui_attach"));
  harness.resetMock();
  await (await findByText(driver, "button", t("library_ui_attach"))).click();
  await findByText(driver, "[role=status]", t("library_ui_attached"));

  await driver.switchTo().window(sidebar);
  await find(driver, ".sb-chips .chip__title");
  expect(await driver.findElement(By.css(".sb-chips")).getText()).toContain(ARTICLE_TITLE);
  expect(harness.mock.requests).toEqual([]);
  await ask(harness, "Que contient cette entrée ?");
  await waitForDone(harness);
  expect(JSON.stringify(harness.mock.requests[0]?.body)).toContain(ARTICLE_TEXT);

  await driver.switchTo().window(library);
  await (await findByText(driver, "button", t("library_ui_exportMarkdown"))).click();
  const markdown = await downloaded("lire-dans-la-marge.md");
  expect(markdown.startsWith("---\n")).toBe(true);
  expect(markdown).toContain(ARTICLE_TITLE);
  expect(markdown).toContain(ARTICLE_TEXT);

  await driver.get(harness.extension("library-ui.html"));
  await (await findByText(driver, "button", t("library_ui_exportAll"))).click();
  const jsonName = await downloadedMatching((name) => name.endsWith(".json"));
  const exported = JSON.parse(readFileSync(join(harness.downloadsDir, jsonName), "utf8")) as { artifacts: { title: string }[] };
  expect(exported.artifacts.map((artifact) => artifact.title)).toContain(ARTICLE_TITLE);
});

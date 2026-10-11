import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { By, Key } from "selenium-webdriver";
import { afterAll, beforeAll, expect, it } from "vitest";
import { startHarness } from "./harness";
import type { Harness } from "./harness";
import { enableAllSites, startSession, storeApiKey } from "./session";
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

async function savePage(): Promise<void> {
  const draft = { title: ARTICLE_TITLE, url: null, sourceType: "note", tags: [], markdown: ARTICLE_TEXT };
  await runInPage(harness.driver, `await browser.runtime.sendMessage({ type: "artifact/save", draft: arguments[0] });`, draft);
}

async function openLibrary(): Promise<void> {
  await openExtensionPage(harness, "library-ui.html", ".lib");
}

async function searchFor(query: string): Promise<void> {
  const input = await find(harness.driver, "input[type=search]");
  await input.clear();
  await input.sendKeys(query);
}

it("shows the empty state without the export action on an empty library", async () => {
  const { driver } = harness;
  await openLibrary();

  await findByText(driver, "h2", t("library_ui_emptyTitle"));
  expect(await driver.findElements(By.css("footer.lib__foot"))).toHaveLength(0);
});

it("shows the no-result state for an unknown query and clears it back to the list", async () => {
  const { driver } = harness;
  await savePage();
  await openLibrary();

  await findByText(driver, ".row-title button", ARTICLE_TITLE);
  await searchFor("zzyzx");
  await findByText(driver, "[role=status] h2", t("library_ui_noResultTitle", { query: "zzyzx" }));
  expect(await driver.findElements(By.css(".row-title button"))).toHaveLength(0);

  await (await findByText(driver, "button", t("library_ui_clearSearch"))).click();
  await findByText(driver, ".row-title button", ARTICLE_TITLE);
  expect(await (await find(driver, "input[type=search]")).getAttribute("value")).toBe("");
});

it("reports the search hit count and highlights the match", async () => {
  const { driver } = harness;
  await searchFor("marge");

  await findByText(driver, "[role=status]", t("library_ui_resultsOne", { query: "marge" }));
  expect(await (await find(driver, "mark.hit")).getText()).toBe("marge");
});

it("attaches an entry from the keyboard with Enter on its title", async () => {
  const { driver } = harness;
  await searchFor("");
  const title = await findByText(driver, ".row-title button", ARTICLE_TITLE);
  await title.sendKeys(Key.ENTER);

  await findByText(driver, "[role=status]", t("library_ui_attached"));
});

it("imports an exported file back and reports the import", async () => {
  const { driver } = harness;
  await (await findByText(driver, "button", t("library_ui_exportAll"))).click();
  await driver.wait(() => readdirSync(harness.downloadsDir).some((name) => name.endsWith(".json")), 10_000);
  const exportName = readdirSync(harness.downloadsDir).find((name) => name.endsWith(".json")) as string;

  await driver.get(harness.extension("library-ui.html"));
  await find(driver, "input[type=search]");
  await driver.get(harness.extension("options.html"));
  await find(driver, "#api-key");
  await (await driver.findElement(By.css("#library-import"))).sendKeys(join(harness.downloadsDir, exportName));

  await findByText(driver, "[role=status]", t("library_ui_importReportTitle"));
  expect(readFileSync(join(harness.downloadsDir, exportName), "utf8")).toContain(ARTICLE_TITLE);
});

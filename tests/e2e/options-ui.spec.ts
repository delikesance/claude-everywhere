import { readFileSync } from "node:fs";
import { join } from "node:path";
import { By } from "selenium-webdriver";
import { afterAll, beforeAll, expect, it } from "vitest";
import { startHarness } from "./harness";
import type { Harness } from "./harness";
import { reloadOptions, startSession } from "./session";
import { bodyText, findByText, openExtensionPage, runInPage, t } from "./ui";

let harness: Harness;

beforeAll(async () => {
  harness = await startHarness();
  await startSession(harness);
});
afterAll(() => harness.close());

const catalog = (locale: "en" | "fr") =>
  JSON.parse(readFileSync(join(import.meta.dirname, `../../dist-test/locales/${locale}.json`), "utf8")) as Record<string, string>;

const storedSettings = () => runInPage<Record<string, unknown>>(harness.driver, `return (await browser.storage.local.get("settings")).settings ?? {};`);

const documentTheme = () => runInPage<string | null>(harness.driver, `return document.documentElement.getAttribute("data-theme");`);

async function pickOption(selector: string, value: string): Promise<void> {
  await harness.driver.findElement(By.css(`${selector} option[value="${value}"]`)).click();
}

async function openAdvanced(): Promise<void> {
  await (await harness.driver.findElement(By.css("details.advanced summary"))).click();
}

it("switches the interface to English and back to French, live", async () => {
  const { driver } = harness;
  await pickOption("#ui-language", "en");

  await findByText(driver, "h1", catalog("en").options_pageTitle as string);
  expect(await storedSettings()).toMatchObject({ uiLocale: "en" });

  await pickOption("#ui-language", "fr");
  await findByText(driver, "h1", t("options_pageTitle"));
});

it("applies the chosen UI language to the library page", async () => {
  const { driver } = harness;
  await pickOption("#ui-language", "en");
  await findByText(driver, "h1", catalog("en").options_pageTitle as string);

  await openExtensionPage(harness, "library-ui.html", ".lib");
  await findByText(driver, "h1", catalog("en").library_ui_pageTitle as string);

  await driver.close();
  await driver.switchTo().window((await driver.getAllWindowHandles())[0] as string);
  await driver.get(harness.extension("options.html"));
  await findByText(driver, "h1", catalog("en").options_pageTitle as string);
  await pickOption("#ui-language", "fr");
  await findByText(driver, "h1", t("options_pageTitle"));
});

it("applies the dark theme to the options page and stores it", async () => {
  const { driver } = harness;
  await (await findByText(driver, "[role=radio]", t("shared_themeDark"))).click();

  expect(await documentTheme()).toBe("dark");
  expect(await storedSettings()).toMatchObject({ theme: "dark" });
});

it("keeps the chosen default model after a reload", async () => {
  const { driver } = harness;
  await pickOption("#default-model", "claude-opus-5-5");
  await reloadOptions(harness);

  expect(await driver.findElement(By.css("#default-model")).getAttribute("value")).toBe("claude-opus-5-5");
});

it("keeps the advanced settings collapsed until opened", async () => {
  const { driver } = harness;
  expect(await driver.findElement(By.css("details.advanced")).getAttribute("open")).toBeNull();

  await openAdvanced();
  await findByText(driver, "details.advanced", t("options_sitesTitle"));
  expect(await driver.findElements(By.css("details.advanced [role=switch]"))).toHaveLength(2);
});

it("asks for confirmation before erasing everything and keeps data when cancelled", async () => {
  const { driver } = harness;
  await (await findByText(driver, "button", t("options_dataEraseAll"))).click();
  await findByText(driver, "[role=group]", t("options_dataEraseConfirm"));

  await (await findByText(driver, "button", t("options_cancel"))).click();
  expect(await driver.findElements(By.css("[role=group]"))).toHaveLength(0);
});

it("shows the privacy statement and a native host result", async () => {
  const { driver } = harness;
  await findByText(driver, "details.advanced p.caption", t("options_privacyStatement"));

  await (await findByText(driver, "button", t("options_nativeTest"))).click();
  await driver.wait(async () => (await driver.findElements(By.css(".help--ok, .help--error"))).length > 0, 10_000);
  expect(await bodyText(driver)).toContain(t("options_nativeHint"));
});

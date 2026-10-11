import { By } from "selenium-webdriver";
import { afterAll, beforeAll, expect, it } from "vitest";
import { API_KEY, startHarness } from "./harness";
import type { Harness } from "./harness";
import { reloadOptions, startSession, storeApiKey, submitKey } from "./session";
import { bodyText, findByText, runInPage, t } from "./ui";

let harness: Harness;

beforeAll(async () => {
  harness = await startHarness();
  await startSession(harness);
});
afterAll(() => harness.close());

const storedKey = () => runInPage<string | null>(harness.driver, `return (await browser.storage.local.get("settings")).settings?.apiKey ?? null;`);

it("rejects an invalid key with an error and stores nothing", async () => {
  await submitKey(harness, "sk-ant-invalid");
  await findByText(harness.driver, "[role=status]", t("options_keyAuthError"));
  expect(await storedKey()).toBeNull();
});

it("validates a key against the API, stores it, and shows it masked", async () => {
  await reloadOptions(harness);
  harness.resetMock();
  await storeApiKey(harness);

  await findByText(harness.driver, ".caption", t("options_keyStored", { mask: "sk-ant-…0042" }));
  expect(await storedKey()).toBe(API_KEY);
  expect(await harness.driver.getPageSource()).not.toContain(API_KEY);
  expect(await bodyText(harness.driver)).not.toContain(API_KEY);
  expect(await harness.driver.findElement(By.css("#api-key")).getAttribute("value")).toBe("");

  const [validation] = harness.mock.requests;
  expect(harness.mock.requests).toHaveLength(1);
  expect(validation?.headers["x-api-key"]).toBe(API_KEY);
});

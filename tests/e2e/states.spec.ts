import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { By } from "selenium-webdriver";
import { DEFAULT_MAX_TOKENS, MAX_OUTPUT_TOKENS } from "../../src/shared/constants";
import { API_KEY, startHarness } from "./harness";
import type { Harness } from "./harness";
import { enableAllSites, startSession, storeApiKey } from "./session";
import { addFromPage, answerText, ask, openSidebarBeside } from "./sidebar";
import type { PageUnderTest } from "./sidebar";
import { bodyText, closeOtherTabs, find, findByText, jsClick, openExtensionPage, patchStoredSettings, runInPage, selectTab, t, waitForScript } from "./ui";

const INVALID_KEY = "sk-ant-invalid";
const KEY_INPUT = "#key-setup-input";
const NOTICE = ".notice";
const ALERT_NOTICE = `${NOTICE}[role=alert]`;
const TAB_NOTICE = ".tab-notice";
const RETRY_WAIT_MS = 10_000;

let harness: Harness;
let page: PageUnderTest;

const apiRequests = () => harness.mock.requests.filter((request) => request.url.startsWith("/v1/messages"));
const noticeButton = (label: string) => findByText(harness.driver, `${NOTICE} .btn`, label);
const textOf = (css: string) => waitForScript(harness.driver, "document.querySelector(arguments[0])?.textContent", css) as Promise<string>;
const elementCount = async (css: string) => (await harness.driver.findElements(By.css(css))).length;
const isPresent = (css: string) => waitForScript(harness.driver, "document.querySelector(arguments[0])", css);
const isAbsent = (css: string) => waitForScript(harness.driver, "!document.querySelector(arguments[0])", css);

async function setStoredKey(key: string | null): Promise<void> {
  await patchStoredSettings(harness.driver, { apiKey: key });
}

async function sidebarWithArticle(url = harness.fixture("article.html")): Promise<void> {
  page = await openSidebarBeside(harness, url);
  await addFromPage(harness, page, t("sidebar_addPage"));
}

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
  await setStoredKey(API_KEY);
});

describe("missing key", () => {
  beforeEach(async () => {
    await setStoredKey(null);
    await openExtensionPage(harness, "sidebar.html", KEY_INPUT);
  });

  it("shows the single inline setup with its copy and help link", async () => {
    await findByText(harness.driver, "h2", t("sidebar_key_title"));
    const help = await findByText(harness.driver, "a.key-setup__help", t("sidebar_key_where"));
    expect(await help.getAttribute("href")).toBe("https://console.anthropic.com/settings/keys");
    expect(await textOf(".key-setup")).toContain(t("sidebar_key_claudeCode"));
    expect(await (await find(harness.driver, "textarea")).getAttribute("disabled")).not.toBeNull();
  });

  it("refuses a key the API rejects, with the field marked invalid", async () => {
    await (await find(harness.driver, KEY_INPUT)).sendKeys(INVALID_KEY);
    await (await find(harness.driver, "button.btn--primary")).click();
    await findByText(harness.driver, ".help--error", t("sidebar_key_invalid"));
    expect(await (await find(harness.driver, KEY_INPUT)).getAttribute("aria-invalid")).toBe("true");
  });

  it("asks for a key when submitted empty", async () => {
    await (await find(harness.driver, "button.btn--primary")).click();
    await findByText(harness.driver, ".help--error", t("sidebar_key_empty"));
  });

  it("stores a valid key, enables the composer and focuses it", async () => {
    await (await find(harness.driver, KEY_INPUT)).sendKeys(API_KEY);
    await (await find(harness.driver, "button.btn--primary")).click();
    await isAbsent(".key-setup");
    await waitForScript(harness.driver, `document.activeElement?.tagName === "TEXTAREA" && !document.activeElement.disabled`);
  });

  it("hands over to Claude Code without asking for a key", async () => {
    await jsClick(harness.driver, await findByText(harness.driver, "button", t("sidebar_key_claudeCode")));
    await isAbsent(".key-setup");
    expect(await runInPage<string>(harness.driver, `return (await browser.storage.local.get("settings")).settings.backend;`)).toBe("claude-code");
    await patchStoredSettings(harness.driver, { backend: "api" });
  });
});

describe("API errors in a conversation", () => {
  it("shows a refused key as an alert with a settings button", async () => {
    await setStoredKey(INVALID_KEY);
    await sidebarWithArticle();
    await ask(harness, "Question");
    await findByText(harness.driver, ALERT_NOTICE, t("sidebar_errAuthTitle"));
    expect(await bodyText(harness.driver)).toContain(t("sidebar_errAuthBody"));
    await noticeButton(t("sidebar_openSettings"));
  });

  it("keeps the partial answer on a network drop and retries with a new request", async () => {
    await sidebarWithArticle();
    await ask(harness, "Question [scenario:drop]");
    await findByText(harness.driver, ALERT_NOTICE, t("sidebar_errNetworkTitle"));
    expect(await answerText(harness)).toContain("Bonjour");
    await jsClick(harness.driver, await noticeButton(t("sidebar_retry")));
    await harness.driver.wait(async () => apiRequests().length === 2, RETRY_WAIT_MS);
    expect(JSON.stringify(apiRequests()[1]?.body)).toContain("Question [scenario:drop]");
  });

  it("disables retry during the rate-limit countdown, then retries", async () => {
    await sidebarWithArticle();
    await ask(harness, "Question [scenario:rate_limit]");
    await findByText(harness.driver, ALERT_NOTICE, t("sidebar_errRateTitle"));
    expect(await (await noticeButton(t("sidebar_retry"))).getAttribute("aria-disabled")).toBe("true");
    await harness.driver.wait(async () => (await (await noticeButton(t("sidebar_retry"))).getAttribute("aria-disabled")) === null, RETRY_WAIT_MS);
    await jsClick(harness.driver, await noticeButton(t("sidebar_retry")));
    await harness.driver.wait(async () => apiRequests().length === 2, RETRY_WAIT_MS);
  });

  it("shows the overloaded notice as an alert and retries", async () => {
    await sidebarWithArticle();
    await ask(harness, "Question [scenario:overloaded]");
    await findByText(harness.driver, ALERT_NOTICE, t("sidebar_errOverloadedTitle"));
    await jsClick(harness.driver, await noticeButton(t("sidebar_retry")));
    await harness.driver.wait(async () => apiRequests().length === 2, RETRY_WAIT_MS);
  });
});

describe("protected page", () => {
  it("shows the lock notice without a chip and keeps the composer usable", async () => {
    page = await openSidebarBeside(harness, "about:support");
    await addFromPage(harness, page, t("sidebar_addPage"), NOTICE);
    await findByText(harness.driver, NOTICE, t("sidebar_protectedBody"));
    expect(await elementCount(".chip")).toBe(0);
    const composer = await find(harness.driver, "textarea");
    await composer.sendKeys("Question libre");
    expect(await composer.getAttribute("value")).toBe("Question libre");
  });
});

describe("long page", () => {
  it("announces the characters sent out of the total", async () => {
    await patchStoredSettings(harness.driver, { maxTokens: MAX_OUTPUT_TOKENS });
    try {
      await sidebarWithArticle(harness.fixture("very-long.html"));
      await findByText(harness.driver, ".notice--warning", "Document long :");
      expect(await bodyText(harness.driver)).toMatch(/Document long : [\d\s ]+ caractères envoyés sur [\d\s ]+\./);
    } finally {
      await patchStoredSettings(harness.driver, { maxTokens: DEFAULT_MAX_TOKENS });
    }
  });
});

describe("tab change notice", () => {
  async function sidebarBesideArticle(): Promise<number> {
    page = await openSidebarBeside(harness, harness.fixture("article.html"));
    return page.tabId;
  }

  it("does not show the notice for the extension's own page", async () => {
    await sidebarBesideArticle();
    await harness.driver.sleep(1000);
    expect(await elementCount(TAB_NOTICE)).toBe(0);
  });

  it("does not show the notice when an extension page becomes active", async () => {
    await sidebarBesideArticle();
    await runInPage(
      harness.driver,
      `const tab = await browser.tabs.create({ url: browser.runtime.getURL("options.html"), active: false });
       await browser.tabs.update(tab.id, { active: true });`,
    );
    await harness.driver.sleep(1000);
    expect(await isAbsent(TAB_NOTICE)).toBe(true);
  });

  it("drops a notice when another tab becomes active, and reads it on request", async () => {
    const articleTab = await sidebarBesideArticle();
    await selectTab(harness.driver, articleTab);
    await isPresent(TAB_NOTICE);
    expect(await textOf(TAB_NOTICE)).toContain(t("sidebar_tabChangedBody"));
    await jsClick(harness.driver, await findByText(harness.driver, `${TAB_NOTICE} .btn`, t("sidebar_readPage")));
    await isAbsent(TAB_NOTICE);
    await isPresent(".chip");
  });

  it("keeps the previous page when asked to", async () => {
    const articleTab = await sidebarBesideArticle();
    await selectTab(harness.driver, articleTab);
    await isPresent(TAB_NOTICE);
    await jsClick(harness.driver, await findByText(harness.driver, `${TAB_NOTICE} .btn`, t("sidebar_keepPreviousPage")));
    await isAbsent(TAB_NOTICE);
    expect(await elementCount(".chip")).toBe(0);
  });

  it("shows no notice when the sidebar's own tab is selected again", async () => {
    await sidebarBesideArticle();
    const sidebarTab = await runInPage<number>(harness.driver, `return (await browser.tabs.getCurrent()).id;`);
    await selectTab(harness.driver, sidebarTab);
    await harness.driver.sleep(1000);
    expect(await elementCount(TAB_NOTICE)).toBe(0);
  });
});

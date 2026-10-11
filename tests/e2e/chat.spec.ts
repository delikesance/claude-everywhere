import { afterAll, beforeAll, beforeEach, expect, it } from "vitest";
import { API_KEY, startHarness } from "./harness";
import type { Harness } from "./harness";
import { enableAllSites, startSession, storeApiKey } from "./session";
import { addFromPage, answerText, ask, openSidebarBeside, waitForDone } from "./sidebar";
import type { PageUnderTest } from "./sidebar";
import { bodyText, closeOtherTabs, find, findByText, jsClick, openExtensionPage, runInPage, t } from "./ui";

let harness: Harness;
let page: PageUnderTest;

const articleText = "Annoter un texte en marge est une habitude ancienne";
const apiRequests = () => harness.mock.requests.filter((request) => request.url.startsWith("/v1/messages"));
const sentUserText = (index = 0) => JSON.stringify(apiRequests()[index]?.body);

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

async function sidebarWithArticle(): Promise<void> {
  page = await openSidebarBeside(harness, harness.fixture("article.html"));
  await addFromPage(harness, page, t("sidebar_addPage"));
}

it("sends nothing until the user acts", async () => {
  for (const extensionPage of ["sidebar.html", "library-ui.html", "options.html"]) {
    await openExtensionPage(harness, extensionPage, "#root > *");
  }
  await harness.driver.get(harness.fixture("article.html"));
  await harness.driver.sleep(1500);
  expect(harness.mock.requests).toEqual([]);
});

it("shows what is sent, streams the answer, and sends the page text with the user's key", async () => {
  await sidebarWithArticle();

  const slip = await find(harness.driver, ".slip__toggle");
  await jsClick(harness.driver, slip);
  const lines = await bodyText(harness.driver);
  expect(lines).toMatch(/Lire dans la marge\s+\d/);
  expect(harness.mock.requests).toEqual([]);

  await ask(harness, "Que dit cet article ? [scenario:slow]");
  const seen = new Set<string>();
  await harness.driver.wait(async () => {
    seen.add(await answerText(harness));
    return (await answerText(harness)).includes("factice");
  }, 10_000);
  const partial = [...seen].filter((text) => text !== "" && !text.includes("factice"));
  expect(partial.length).toBeGreaterThan(0);
  await waitForDone(harness);

  expect(apiRequests()).toHaveLength(1);
  const request = apiRequests()[0];
  expect(request?.headers["x-api-key"]).toBe(API_KEY);
  expect(sentUserText()).toContain(articleText);
  expect(sentUserText()).toContain("Que dit cet article ?");
  expect(sentUserText()).not.toContain("NAV_ACCUEIL");
  expect(harness.mock.requests.every((recorded) => recorded.url.startsWith("/v1/"))).toBe(true);
});

it("lets the user stop an answer mid-stream and keeps the partial text", async () => {
  await sidebarWithArticle();
  await ask(harness, "Résume. [scenario:slow]");
  await harness.driver.wait(async () => (await answerText(harness)) !== "", 10_000);
  await (await find(harness.driver, ".btn--stop")).click();

  await findByText(harness.driver, ".notice", "Interrompu par vous");
  expect(await answerText(harness)).not.toContain("factice");
});

it.each([
  ["rate_limit", "sidebar_errRateTitle"],
  ["overloaded", "sidebar_errOverloadedTitle"],
])("shows the %s notice", async (scenario, titleKey) => {
  await sidebarWithArticle();
  await ask(harness, `Question [scenario:${scenario}]`);
  await findByText(harness.driver, ".notice", t(titleKey));
  expect(await (await find(harness.driver, ".notice .btn")).getText()).toBe(t("sidebar_retry"));
});

it("renders model markdown with no active script, handler or javascript: link", async () => {
  await sidebarWithArticle();
  await ask(harness, "Montre-moi du HTML [scenario:unsafe_markdown]");
  await waitForDone(harness);

  const rendered = await runInPage<{ html: string; pwned: unknown; scripts: number; handlers: number; jsLinks: number }>(
    harness.driver,
    `const md = [...document.querySelectorAll(".md")].at(-1);
     return {
       html: md.innerHTML,
       pwned: window.pwned ?? null,
       scripts: md.querySelectorAll("script").length,
       handlers: [...md.querySelectorAll("*")].filter((el) => [...el.attributes].some((a) => a.name.startsWith("on"))).length,
       jsLinks: [...md.querySelectorAll("a")].filter((a) => a.getAttribute("href")?.toLowerCase().startsWith("javascript:")).length,
     };`,
  );
  expect(rendered.pwned).toBeNull();
  expect(rendered.scripts).toBe(0);
  expect(rendered.handlers).toBe(0);
  expect(rendered.jsLinks).toBe(0);
  expect(rendered.html).toContain("https://example.org/ok");
});

it("counts the earlier messages in the pill once the conversation has history", async () => {
  await sidebarWithArticle();
  await ask(harness, "Première question ?");
  await waitForDone(harness);
  await findByText(harness.driver, ".sb-pill", t("sidebar_slipHistoryMany", { count: 2 }));
});

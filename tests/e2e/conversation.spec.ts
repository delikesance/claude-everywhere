import { afterAll, beforeAll, beforeEach, expect, it } from "vitest";
import { By, Key } from "selenium-webdriver";
import { startHarness } from "./harness";
import type { Harness } from "./harness";
import { enableAllSites, setTheme, startSession, storeApiKey } from "./session";
import { addFromPage, answerText, ask, openSidebarBeside, waitForDone } from "./sidebar";
import type { PageUnderTest } from "./sidebar";
import { closeOtherTabs, find, findByText, jsClick, openExtensionPage, runInPage, t } from "./ui";

let harness: Harness;
let page: PageUnderTest;

const apiRequests = () => harness.mock.requests.filter((request) => request.url.startsWith("/v1/messages"));
const userTurns = () => harness.driver.findElements(By.css(".msg-user p"));
const normalizeSpace = (text: string) => text.replace(/\s+/g, " ").trim();
const answers = () => harness.driver.findElements(By.css(".reading"));

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

async function pressEscape(): Promise<void> {
  await harness.driver.findElement(By.css("body")).sendKeys(Key.ESCAPE);
}

async function clickButton(label: string): Promise<void> {
  await jsClick(harness.driver, await findByText(harness.driver, "button", label));
}

it("starts from the empty state with the three suggestions", async () => {
  await sidebarWithArticle();
  await find(harness.driver, ".sb-empty h1");
  const suggestions = await harness.driver.findElements(By.css(".suggestion"));
  expect(await Promise.all(suggestions.map((el) => el.getText()))).toEqual([
    t("sidebar_suggestSummary"),
    t("sidebar_suggestSimple"),
    t("sidebar_suggestFigures"),
  ]);
  expect(normalizeSpace(await (await find(harness.driver, ".sb-empty h1")).getText())).toBe(normalizeSpace(t("sidebar_askPage")));
});

it("sends the clicked suggestion as the first user message", async () => {
  await sidebarWithArticle();
  await jsClick(harness.driver, await findByText(harness.driver, ".suggestion", t("sidebar_suggestSimple")));
  await waitForDone(harness);

  expect(await (await userTurns())[0]?.getText()).toBe(t("sidebar_suggestSimple"));
  expect(apiRequests()).toHaveLength(1);
  expect(await harness.driver.findElements(By.css(".sb-empty"))).toHaveLength(0);
});

it("shows caret, dots and waiting status while streaming, then the done status", async () => {
  await sidebarWithArticle();
  await ask(harness, "Question [scenario:slow]");
  await find(harness.driver, ".caret");
  await find(harness.driver, ".anim-dots");
  await findByText(harness.driver, "[role=status]", t("sidebar_statusWriting"));
  await waitForDone(harness);

  expect(await harness.driver.findElements(By.css(".caret"))).toHaveLength(0);
  expect(await harness.driver.findElements(By.css(".anim-dots"))).toHaveLength(0);
});

it("cancels the answer with Escape and keeps the partial text", async () => {
  await sidebarWithArticle();
  await ask(harness, "Résume. [scenario:slow]");
  await harness.driver.wait(async () => (await answerText(harness)) !== "", 10_000);
  await pressEscape();

  await findByText(harness.driver, "[role=status]", t("sidebar_statusInterrupted"));
  expect(await answerText(harness)).not.toContain("factice");
  expect(await answerText(harness)).not.toBe("");
});

it("keeps an answer in place as Gardé", async () => {
  await sidebarWithArticle();
  await ask(harness, "Question à garder");
  await waitForDone(harness);
  await clickButton(t("sidebar_keep"));

  await findByText(harness.driver, "button", t("sidebar_kept"));
  expect(await (await findByText(harness.driver, "button", t("sidebar_kept"))).getAttribute("aria-pressed")).toBe("true");
});

it("lists a kept answer in the library", async () => {
  await sidebarWithArticle();
  await ask(harness, "Question à retrouver");
  await waitForDone(harness);
  await clickButton(t("sidebar_keep"));
  await findByText(harness.driver, "button", t("sidebar_kept"));

  await openExtensionPage(harness, "library-ui.html", ".row-title button");
  await findByText(harness.driver, ".row-title button", "Bonjour depuis le serveur factice.");
});

it("copies the answer and shows the copied label", async () => {
  await sidebarWithArticle();
  await ask(harness, "Question à copier");
  await waitForDone(harness);
  await clickButton(t("sidebar_copy"));

  await findByText(harness.driver, "button", t("sidebar_copied"));
});

it("regenerates the last answer with a new request", async () => {
  await sidebarWithArticle();
  await ask(harness, "Question à régénérer");
  await waitForDone(harness);
  await clickButton(t("sidebar_regenerate"));

  await harness.driver.wait(async () => apiRequests().length === 2, 10_000);
  await waitForDone(harness);
  expect(await answers()).toHaveLength(2);
});

it("sends a follow-up suggestion from the last answer", async () => {
  await sidebarWithArticle();
  await ask(harness, "Question de suivi");
  await waitForDone(harness);
  await jsClick(harness.driver, await findByText(harness.driver, ".followup", t("sidebar_followUpDetail")));
  await harness.driver.wait(async () => apiRequests().length === 2, 10_000);
  await waitForDone(harness);

  expect(await (await userTurns())[1]?.getText()).toBe(t("sidebar_followUpDetail"));
});

it("starts a new conversation from the header button", async () => {
  await sidebarWithArticle();
  await ask(harness, "Question avant reset");
  await waitForDone(harness);
  await jsClick(harness.driver, await find(harness.driver, `button[aria-label="${t("sidebar_newConversation")}"]`));

  await find(harness.driver, ".sb-empty h1");
  expect(await userTurns()).toHaveLength(0);
  expect(await (await find(harness.driver, ".sb-title__text")).getText()).toBe(t("sidebar_newConversation"));
});

it("toggles the history view from the title and reopens a conversation", async () => {
  await sidebarWithArticle();
  await ask(harness, "Première question de l'historique");
  await waitForDone(harness);
  await jsClick(harness.driver, await find(harness.driver, ".sb-title"));
  await findByText(harness.driver, "h2", t("sidebar_historyTitle"));
  expect(await (await find(harness.driver, ".sb-title")).getAttribute("aria-expanded")).toBe("true");

  await jsClick(harness.driver, await findByText(harness.driver, ".sb-conv button", "Première question"));
  await findByText(harness.driver, ".msg-user p", "Première question de l'historique");
  expect(await (await find(harness.driver, ".sb-title")).getAttribute("aria-expanded")).toBe("false");
});

it("deletes a conversation after confirmation", async () => {
  await sidebarWithArticle();
  await ask(harness, "Question à supprimer");
  await waitForDone(harness);
  await jsClick(harness.driver, await find(harness.driver, ".sb-title"));
  const row = await findByText(harness.driver, "li", "Question à supprimer");
  await jsClick(harness.driver, await row.findElement(By.css(`button[aria-label="${t("sidebar_deleteConversation")}"]`)));
  await findByText(harness.driver, "[role=dialog]", t("sidebar_confirmDeleteTitle"));
  await clickButton(t("sidebar_delete"));

  await harness.driver.wait(async () => (await harness.driver.findElements(By.css("[role=dialog]"))).length === 0, 10_000);
  expect(await harness.driver.findElements(By.xpath(`//li[contains(., "Question à supprimer")]`))).toHaveLength(0);
});

it.each([
  [280, "light"],
  [280, "dark"],
  [360, "light"],
  [360, "dark"],
] as const)("keeps header, footer and bubbles unclipped at %dpx in the %s theme", async (width, theme) => {
  await sidebarWithArticle();
  await ask(harness, "Question étroite");
  await waitForDone(harness);
  await harness.driver.manage().window().setRect({ width, height: 800 });
  await setTheme(harness, theme);
  await find(harness.driver, `html[data-theme=${theme}]`);

  const clipped = await runInPage<string[]>(
    harness.driver,
    `return [".sb-header", ".composer", ".msg-footer", ".msg-user", ".reading"]
      .flatMap((selector) => [...document.querySelectorAll(selector)])
      .filter((el) => el.scrollWidth > el.clientWidth)
      .map((el) => el.className);`,
  );
  expect(clipped).toEqual([]);
});

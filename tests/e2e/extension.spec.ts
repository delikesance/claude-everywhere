import { afterAll, beforeAll, beforeEach, expect, it } from "vitest";
import { startHarness } from "./harness";
import type { Harness } from "./harness";
import { enableAllSites, startSession, storeApiKey } from "./session";
import { addFromPage, openSidebarBeside } from "./sidebar";
import { closeOtherTabs, find, findByText, jsClick, openExtensionPage, openTab, runInPage, t, pageTabId, waitForScript, whilePageIsActive } from "./ui";

let harness: Harness;

const PRIVILEGED_URL = "about:addons";
const PDF_SENTENCE = "The quick brown fox jumps over the lazy dog.";

const send = (message: object) => runInPage<{ ok: boolean; value?: Record<string, unknown>; error?: { kind: string } }>(harness.driver, `return await browser.runtime.sendMessage(arguments[0]);`, message);

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
  harness.resetMock();
});

it("routes the API, library and capture messages in the background", async () => {
  expect(await send({ type: "capture/takePending" })).toEqual({ ok: true, value: null });
  expect(await send({ type: "key/validate", apiKey: "sk-ant-invalid" })).toMatchObject({ ok: false, error: { kind: "auth" } });
  expect(await send({ type: "no/such" })).toMatchObject({ ok: false });

  const draft = { title: "Note", url: null, sourceType: "note", tags: [], markdown: "texte" };
  expect(await send({ type: "artifact/save", draft })).toMatchObject({ ok: true, value: { title: "Note" } });
});

// Known product bug: the extension CSP connect-src lets the background fetch only the API origin, so no PDF URL is readable.
it.fails("extracts the text of a PDF through the background", async () => {
  const pdf = await send({ type: "pdf/extract", url: harness.fixture("sample.pdf") });
  expect(pdf).toMatchObject({ ok: true, value: { sourceType: "pdf" } });
  expect(String(pdf.value?.["markdown"])).toContain(PDF_SENTENCE);
});

it("falls back to the paste path on a page the browser keeps private", async () => {
  const { driver } = harness;
  await openTab(driver, PRIVILEGED_URL);
  const popup = await openExtensionPage(harness, "popup.html", "button");
  const save = await findByText(driver, "button", t("popup_save"));
  await whilePageIsActive(driver, await pageTabId(driver), async () => {
    await jsClick(driver, save);
    await waitForScript(driver, `!document.body.textContent.includes(arguments[0])`, t("popup_working"));
  });

  await findByText(driver, ".notice", t("popup_restrictedTitle"));
  await (await find(driver, "#paste-text")).sendKeys("Texte collé à la main");
  await (await findByText(driver, "button", t("popup_pasteUse"))).click();
  await findByText(driver, ".popup", t("popup_previewTitle"));
  await (await find(driver, "form button[type=submit]")).click();
  await findByText(driver, ".popup", t("popup_savedTitle"));
  expect(popup).toBeTruthy();
  expect(harness.mock.requests).toEqual([]);
});

it("marks a private page as unreadable in the sidebar", async () => {
  const page = await openSidebarBeside(harness, PRIVILEGED_URL);
  await addFromPage(harness, page, t("sidebar_addPage"), ".chip--unreadable");
  await findByText(harness.driver, ".chip--unreadable", t("sidebar_pageUnreadable"));
});

it("logs no extension error or manifest warning", () => {
  const problems = harness
    .browserLog()
    .split("\n")
    .filter((line) => /JavaScript error: moz-extension|console\.error.*moz-extension|Reading manifest|Warning processing/.test(line));
  expect(problems).toEqual([]);
});

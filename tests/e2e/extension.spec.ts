import { afterAll, beforeAll, beforeEach, expect, it } from "vitest";
import { startHarness } from "./harness";
import type { Harness } from "./harness";
import { enableAllSites, startSession, storeApiKey } from "./session";
import { addFromPage, ask, openSidebarBeside, waitForDone } from "./sidebar";
import { closeOtherTabs, findByText, runInPage, t } from "./ui";

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

it("extracts the text of a PDF through the background under the shipped CSP", async () => {
  const pdf = await send({ type: "pdf/extract", url: harness.mockPdf("sample.pdf") });
  expect(pdf).toMatchObject({ ok: true, value: { sourceType: "pdf" } });
  expect(String(pdf.value?.["markdown"])).toContain(PDF_SENTENCE);
  expect(harness.mock.requests).toEqual([]);
});

it("reads an open PDF into the sidebar and sends its text", async () => {
  const page = await openSidebarBeside(harness, harness.mockPdf("sample.pdf"));
  await addFromPage(harness, page, t("sidebar_addPage"));
  await ask(harness, "Que dit ce PDF ?");
  await waitForDone(harness);
  expect(JSON.stringify(harness.mock.requests[0]?.body)).toContain(PDF_SENTENCE);
});

// D-017: only https PDFs are readable; an http PDF on another origin falls back to the restricted/paste path.
it("reports an http PDF on another origin as unreadable", async () => {
  const pdf = await send({ type: "pdf/extract", url: harness.fixture("sample.pdf") });
  expect(pdf).toMatchObject({ ok: false, error: { kind: "permission" } });
});

it("marks a private page as unreadable in the sidebar", async () => {
  const page = await openSidebarBeside(harness, PRIVILEGED_URL);
  await addFromPage(harness, page, t("sidebar_addPage"), ".notice");
  await findByText(harness.driver, ".notice", t("sidebar_protectedBody"));
});

it("logs no extension error or manifest warning", () => {
  const problems = harness
    .browserLog()
    .split("\n")
    .filter((line) => /JavaScript error: moz-extension|console\.error.*moz-extension|Reading manifest|Warning processing/.test(line));
  expect(problems).toEqual([]);
});

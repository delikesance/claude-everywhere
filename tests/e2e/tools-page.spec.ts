import { afterAll, beforeAll, beforeEach, expect, it } from "vitest";
import { formatChars } from "../../src/shared/format";
import { startHarness } from "./harness";
import type { Harness } from "./harness";
import { enableAllSites, startSession, storeApiKey } from "./session";
import { addFromPage, answerText, ask, openSidebarBeside, waitForDone } from "./sidebar";
import { bodyText, closeOtherTabs, find, findByText, jsClick, t } from "./ui";

interface ApiMessage {
  role: string;
  content: unknown;
}

let harness: Harness;

const apiRequests = () => harness.mock.requests.filter((request) => request.url.startsWith("/v1/messages"));

/** The tool_result contents the client sent back in the request at `index`. */
function toolResults(index: number): string[] {
  const messages = (apiRequests()[index]?.body as { messages?: ApiMessage[] } | undefined)?.messages ?? [];
  return messages.flatMap((message) =>
    Array.isArray(message.content)
      ? (message.content as { type: string; content: string }[]).filter((block) => block.type === "tool_result").map((block) => block.content)
      : [],
  );
}

const traceText = async (): Promise<string> => (await find(harness.driver, ".tool-trace")).getText();

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

async function sidebarWithPage(fixture: string): Promise<void> {
  const page = await openSidebarBeside(harness, harness.fixture(fixture));
  await addFromPage(harness, page, t("sidebar_addPage"));
}

/** Waits for the final text of the mock answer, then for the status to be done. */
async function waitForAnswer(): Promise<void> {
  await harness.driver.wait(async () => (await answerText(harness)).includes("factice"), 10_000);
  await waitForDone(harness);
}

async function newConversation(): Promise<void> {
  await jsClick(harness.driver, await find(harness.driver, `button[aria-label="${t("sidebar_newConversation")}"]`));
}

it.each([
  ["article.html", "Lire dans la marge"],
  ["long.html", "The long page"],
])("sends nothing before the user asks, then reads the outline of %s", async (fixture, title) => {
  await sidebarWithPage(fixture);
  expect(harness.mock.requests).toEqual([]);

  await ask(harness, "Quel est le plan ? [tool:page_outline {}]");
  await waitForAnswer();

  expect(apiRequests()).toHaveLength(2);
  const [outline] = toolResults(1);
  expect(outline).toContain(`s1 # ${title}`);
  expect(await answerText(harness)).toContain("factice");

  await findByText(harness.driver, ".tool-trace__name", "page_outline");
  expect(await traceText()).toContain(t("sidebar_toolChars", { chars: outline?.length ?? 0 }));

  await jsClick(harness.driver, await find(harness.driver, ".slip__toggle"));
  expect(await bodyText(harness.driver)).toContain(t("sidebar_slipTools", { chars: formatChars(outline?.length ?? 0) }));
});

it("reads one section by the id the outline gave", async () => {
  await sidebarWithPage("article.html");
  await ask(harness, "Quel est le plan ? [tool:page_outline {}]");
  await waitForAnswer();
  const id = /(s\d+) ## Trois gestes simples/.exec(toolResults(1)[0] ?? "")?.[1];
  expect(id).toBeDefined();

  await newConversation();
  await ask(harness, `Lis cette section [tool:read_section {"id":"${id}"}]`);
  await waitForAnswer();

  expect(apiRequests()).toHaveLength(4);
  expect(toolResults(3)[0]).toContain("Trois gestes simples");
  await findByText(harness.driver, ".tool-trace__name", "read_section");
});

it("finds a text in the page and returns the hits to the model", async () => {
  await sidebarWithPage("article.html");
  await ask(harness, 'Où apparaît "marge" ? [tool:find_in_page {"query":"marge"}]');
  await waitForAnswer();

  expect(apiRequests()).toHaveLength(2);
  const [hits] = toolResults(1);
  expect(hits).toContain("marge");
  await findByText(harness.driver, ".tool-trace__name", "find_in_page");
  expect(await traceText()).toContain(t("sidebar_toolChars", { chars: hits?.length ?? 0 }));
});

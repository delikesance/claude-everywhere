import { By } from "selenium-webdriver";
import { afterAll, beforeAll, beforeEach, expect, it } from "vitest";
import { startHarness } from "./harness";
import type { Harness } from "./harness";
import { enableAllSites, startSession, storeApiKey } from "./session";
import { addFromPage, answerText, ask, openSidebarBeside, waitForDone } from "./sidebar";
import type { PageUnderTest } from "./sidebar";
import { closeOtherTabs, find, findByText, t } from "./ui";

const MAX_TOOL_TURNS = 6;
const TOOL_CALLS_RUN = MAX_TOOL_TURNS - 1;
const WAIT_MS = 10_000;
const STOP = ".btn--stop";
const TOOL_NAME = ".tool-trace__name";

interface ContentBlock {
  type: string;
  content?: unknown;
}

let harness: Harness;
let page: PageUnderTest;

const apiRequests = () => harness.mock.requests.filter((request) => request.url.startsWith("/v1/messages"));

/** Text of the tool_result blocks the client sent back in request `index`. */
function toolResults(index: number): string[] {
  const body = apiRequests()[index]?.body as { messages?: { content: unknown }[] } | undefined;
  return (body?.messages ?? []).flatMap(({ content }) =>
    Array.isArray(content)
      ? (content as ContentBlock[]).filter((block) => block.type === "tool_result").map((block) => String(block.content))
      : [],
  );
}

const countOf = async (css: string): Promise<number> => (await harness.driver.findElements(By.css(css))).length;

async function waitForIdle(): Promise<void> {
  await harness.driver.wait(async () => (await countOf(STOP)) === 0, WAIT_MS);
}

async function waitForRequests(count: number): Promise<void> {
  await harness.driver.wait(async () => apiRequests().length === count, WAIT_MS);
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
});

async function sidebarWithArticle(): Promise<void> {
  page = await openSidebarBeside(harness, harness.fixture("article.html"));
  await addFromPage(harness, page, t("sidebar_addPage"));
}

it("stops the tool loop after MAX_TOOL_TURNS requests and finishes the turn", async () => {
  await sidebarWithArticle();
  await ask(harness, "Lis la page [toolloop:page_outline {}] [scenario:slow]", page);
  await waitForRequests(MAX_TOOL_TURNS);
  await waitForIdle();

  expect(apiRequests()).toHaveLength(MAX_TOOL_TURNS);
  expect(await countOf(TOOL_NAME)).toBe(TOOL_CALLS_RUN);
  expect(await countOf(STOP)).toBe(0);
  await find(harness.driver, `button[aria-label="${t("sidebar_send")}"]`);
});

it("cancels a tool loop mid-run and keeps the chat usable afterwards", async () => {
  await sidebarWithArticle();
  await ask(harness, "Lis la page [toolloop:page_outline {}] [scenario:slow]", page);
  await (await find(harness.driver, STOP)).click();
  await findByText(harness.driver, ".notice", "Interrompu par vous");
  await waitForIdle();
  expect(apiRequests().length).toBeLessThan(MAX_TOOL_TURNS);

  harness.resetMock();
  await ask(harness, "Question suivante ?");
  await waitForDone(harness);
  expect(await answerText(harness)).toContain("factice");
});

it("returns an Error: tool_result for a restricted page and still completes the answer", async () => {
  page = await openSidebarBeside(harness, "about:blank");
  await ask(harness, "Question [tool:page_outline {}]", page);
  await waitForDone(harness);

  expect(apiRequests()).toHaveLength(2);
  const results = toolResults(1);
  expect(results).toHaveLength(1);
  expect(results[0]).toMatch(/^Error:/);
  expect(await answerText(harness)).toContain("factice");
});

it("returns an Error: tool_result for an unknown tool name", async () => {
  await sidebarWithArticle();
  await ask(harness, "Question [tool:no_such_tool {}]", page);
  await waitForDone(harness);

  expect(toolResults(1)).toEqual(["Error: unknown tool no_such_tool"]);
});

// Skipped: the claude-code backend answers through the native host, which the e2e harness does not run,
// so no /v1/messages request exists whose body could show that no tools were sent.
it.skip("sends no tools with the claude-code backend", () => {});

it("keeps the tool rows of a finished turn after the conversation is reloaded", async () => {
  await sidebarWithArticle();
  await ask(harness, "Lis la page [toolloop:page_outline {}] [scenario:slow]", page);
  await waitForRequests(MAX_TOOL_TURNS);
  await waitForIdle();
  expect(await countOf(TOOL_NAME)).toBe(TOOL_CALLS_RUN);

  await harness.driver.navigate().refresh();
  await harness.driver.wait(async () => (await countOf(TOOL_NAME)) === TOOL_CALLS_RUN, WAIT_MS);
});

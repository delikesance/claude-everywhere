import type { WebDriver } from "selenium-webdriver";
import { afterAll, beforeAll, beforeEach, expect, it } from "vitest";
import { startHarness } from "./harness";
import type { Harness } from "./harness";
import { enableAllSites, startSession, storeApiKey } from "./session";
import { ask, openSidebarBeside, waitForDone } from "./sidebar";
import type { PageUnderTest } from "./sidebar";
import { closeOtherTabs } from "./ui";

type ContextDriver = WebDriver & { setContext(context: "chrome" | "content"): Promise<void> };

const YOUTUBE_HOST = "youtube.com";
const WATCH_VIDEO_ID = "e2eVideo001";
const NO_CAPTIONS_VIDEO_ID = "e2eNoCaption";
const NO_TRANSCRIPT = "No transcript is available for this video.";
let harness: Harness;
let page: PageUnderTest;

// youtube.com must resolve to the loopback mock, over plain http and without the HSTS preload list,
// so that the real host check of the tools sees a watch page.
async function resolveYoutubeToLoopback(driver: WebDriver): Promise<void> {
  const contextual = driver as ContextDriver;
  await contextual.setContext("chrome");
  await driver.executeScript(
    `
    Services.prefs.setStringPref("network.dns.localDomains", arguments[0]);
    Services.prefs.setBoolPref("network.stricttransportsecurity.preloadlist", false);
    Services.prefs.setBoolPref("dom.security.https_only_mode", false);
    `,
    YOUTUBE_HOST,
  );
  await contextual.setContext("content");
}

const watchUrl = (videoId: string) => `http://${YOUTUBE_HOST}:${new URL(harness.mock.url).port}/watch?v=${videoId}`;
const apiRequests = () => harness.mock.requests.filter((request) => request.url.startsWith("/v1/messages"));

interface ToolResultBlock {
  type: string;
  content?: unknown;
}

/** The tool_result texts the model received in the last request of the tool loop. */
function toolResults(): string[] {
  const { messages } = apiRequests().at(-1)?.body as { messages: { content: unknown }[] };
  return messages.flatMap(({ content }) =>
    Array.isArray(content)
      ? (content as ToolResultBlock[]).filter((block) => block.type === "tool_result").map((block) => String(block.content))
      : [],
  );
}

/** Asks the mock to call one tool through the sidebar and returns the result the model received. */
async function askTool(marker: string): Promise<string> {
  await ask(harness, `Que vois-tu ? [tool:${marker}]`, page);
  await waitForDone(harness);
  expect(apiRequests()).toHaveLength(2);
  const [result] = toolResults();
  return result ?? "";
}

beforeAll(async () => {
  harness = await startHarness();
  await startSession(harness);
  await storeApiKey(harness);
  await enableAllSites(harness);
  await resolveYoutubeToLoopback(harness.driver);
});
afterAll(() => harness.close());

beforeEach(async () => {
  await closeOtherTabs(harness.driver);
  harness.resetMock();
});

it("video_state returns the title, duration, current time, captions and description of the watch page", async () => {
  page = await openSidebarBeside(harness, watchUrl(WATCH_VIDEO_ID));
  const result = await askTool("video_state {}");

  expect(result).toContain("Title: Vidéo de test");
  expect(result).toContain("Channel: Chaîne de test");
  expect(result).toContain("Duration: 02:05");
  expect(result).toContain("Current time: 00:00");
  expect(result).toContain("Captions: available");
  expect(result).toContain("Description: Une description factice.");
});

it("video_transcript returns the caption lines of the requested range with mm:ss markers", async () => {
  page = await openSidebarBeside(harness, watchUrl(WATCH_VIDEO_ID));
  const result = await askTool('video_transcript {"fromSec":0,"toSec":60}');

  expect(result).toBe("[00:00] Bonjour le monde");
});

it("video_transcript falls back to the video description when the video has no captions", async () => {
  page = await openSidebarBeside(harness, watchUrl(NO_CAPTIONS_VIDEO_ID));
  const result = await askTool('video_transcript {"fromSec":0,"toSec":60}');

  expect(result.startsWith(NO_TRANSCRIPT)).toBe(true);
  expect(result).toContain("Title: Vidéo sans sous-titres");
  expect(result).toContain("Captions: none");
  expect(result).toContain("- [00:00] Intro");
  expect(result).toContain("- [01:02] Ownership");
  expect(result).toContain("Description: Une description sans sous-titres.");
});

it("returns an Error result for a page that is not a YouTube watch page", async () => {
  page = await openSidebarBeside(harness, harness.fixture("article.html"));
  const result = await askTool("video_state {}");

  expect(result).toMatch(/^Error: /);
});

import type { WebDriver } from "selenium-webdriver";
import { afterAll, beforeAll, beforeEach, expect, it } from "vitest";
import { startHarness } from "./harness";
import type { Harness } from "./harness";
import { enableAllSites, startSession } from "./session";
import { closeOtherTabs, openTab, runInPage } from "./ui";

type ContextDriver = WebDriver & { setContext(context: "chrome" | "content"): Promise<void> };

const VIDEO_ID = "e2eVideo001";
const YOUTUBE_HOST = "youtube.com";
let harness: Harness;

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

const watchUrl = () => `http://${YOUTUBE_HOST}:${new URL(harness.mock.url).port}/watch?v=${VIDEO_ID}`;

beforeAll(async () => {
  harness = await startHarness();
  await startSession(harness);
  await enableAllSites(harness);
  await resolveYoutubeToLoopback(harness.driver);
});
afterAll(() => harness.close());

beforeEach(() => closeOtherTabs(harness.driver));

it("exposes the player response to the MAIN world and fetches captions in the page", async () => {
  const { driver } = harness;
  await openTab(driver, watchUrl());
  await driver.sleep(500);
  await driver.switchTo().newWindow("tab");
  await driver.get(harness.extension("options.html"));

  const page = await runInPage<{ title: string; currentTime: number; json3: string; xml: string; url: string }>(
    driver,
    `
    const [tab] = (await browser.tabs.query({})).filter((candidate) => candidate.url.includes("/watch?v="));
    const [injection] = await browser.scripting.executeScript({
      target: { tabId: tab.id },
      world: "MAIN",
      func: async () => {
        const player = window.ytInitialPlayerResponse;
        const baseUrl = player.captions.playerCaptionsTracklistRenderer.captionTracks[0].baseUrl;
        return {
          title: player.videoDetails.title,
          currentTime: document.querySelector("video").currentTime,
          json3: await fetch(baseUrl + "&fmt=json3").then((response) => response.text()),
          xml: await fetch(baseUrl).then((response) => response.text()),
          url: location.href,
        };
      },
    });
    return injection.result;
    `,
  );

  expect(page.url).toContain(`/watch?v=${VIDEO_ID}`);
  expect(page.title).toBe("Vidéo de test");
  expect(page.currentTime).toBe(0);
  expect(JSON.parse(page.json3).events[0].segs[0].utf8).toBe("Bonjour");
  expect(page.xml).toContain('<text start="4" dur="3">le monde</text>');
});

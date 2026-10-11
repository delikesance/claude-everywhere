import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchInTab, readVideoPage } from "./browser-page";
import { JSON3_CAPTIONS } from "./fixtures/json3";
import { PLAYER_RESPONSE } from "./fixtures/player-response";
import { TIMEDTEXT_XML } from "./fixtures/timedtext";
import { videoState, videoTranscript } from "./tools";

vi.mock("./browser-page", () => ({ readVideoPage: vi.fn(), fetchInTab: vi.fn() }));

const ctx = { tabId: 7, signal: new AbortController().signal };
const WATCH_URL = "https://www.youtube.com/watch?v=abc123XYZ00";

function openPage(overrides: Partial<{ url: string; lang: string; currentTime: number | null; player: unknown }> = {}) {
  vi.mocked(readVideoPage).mockResolvedValue({
    url: WATCH_URL,
    lang: "fr",
    currentTime: 75,
    player: PLAYER_RESPONSE,
    ...overrides,
  });
}

beforeEach(() => {
  vi.resetAllMocks();
});

describe("video_state", () => {
  it("describes the video with the current playback time and chapters", async () => {
    openPage();
    const text = await videoState.run({}, ctx);
    expect(text).toContain("Title: Tuto Rust : ownership");
    expect(text).toContain("Current time: 01:15");
    expect(text).toContain("Captions: available");
    expect(text).toContain("- [01:02] Ownership");
  });

  it("rejects pages other than youtube.com/watch", async () => {
    openPage({ url: "https://www.youtube.com/" });
    await expect(videoState.run({}, ctx)).rejects.toThrow("youtube.com/watch");
  });
});

describe("video_transcript", () => {
  it("slices the caption track matching the page language, fetched as json3", async () => {
    openPage();
    vi.mocked(fetchInTab).mockResolvedValueOnce(JSON.stringify(JSON3_CAPTIONS));
    const text = await videoTranscript.run({ fromSec: 0, toSec: 60 }, ctx);
    expect(fetchInTab).toHaveBeenCalledWith(7, expect.stringMatching(/lang=fr.*fmt=json3/));
    expect(text).toBe("[00:00] Bonjour a tous\n[00:31] Le pret");
  });

  it("falls back to the XML track when the json3 body is empty", async () => {
    openPage();
    vi.mocked(fetchInTab).mockResolvedValueOnce("").mockResolvedValueOnce(TIMEDTEXT_XML);
    const text = await videoTranscript.run({ fromSec: 0, toSec: 40 }, ctx);
    expect(text).toBe("[00:00] Tom & Jerry 'hi'\n[00:31] Next <part>");
  });

  it("falls back to the XML track when the json3 body is malformed", async () => {
    openPage();
    vi.mocked(fetchInTab).mockResolvedValueOnce("{not json").mockResolvedValueOnce(TIMEDTEXT_XML);
    const text = await videoTranscript.run({ fromSec: 0, toSec: 40 }, ctx);
    expect(text).toBe("[00:00] Tom & Jerry 'hi'\n[00:31] Next <part>");
  });

  it("says no transcript exists and gives the video state instead of inventing content", async () => {
    openPage({ player: { ...PLAYER_RESPONSE, captions: undefined } });
    const text = await videoTranscript.run({ fromSec: 0, toSec: 60 }, ctx);
    expect(text).toMatch(/^No transcript is available for this video\./);
    expect(text).toContain("Title: Tuto Rust : ownership");
    expect(fetchInTab).not.toHaveBeenCalled();
  });

  it("rejects an invalid range", async () => {
    await expect(videoTranscript.run({ fromSec: 30, toSec: 10 }, ctx)).rejects.toThrow("fromSec and toSec");
  });
});

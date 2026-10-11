import { describe, expect, it } from "vitest";
import { PLAYER_RESPONSE } from "./fixtures/player-response";
import { isWatchPage, parsePlayerResponse, pickTrack } from "./player";

describe("parsePlayerResponse", () => {
  it("reads details, chapters sorted by start and caption tracks", () => {
    expect(parsePlayerResponse(PLAYER_RESPONSE)).toMatchObject({
      title: "Tuto Rust : ownership",
      channel: "Chaine Test",
      durationSec: 212,
      chapters: [
        { startSec: 0, title: "Intro" },
        { startSec: 62, title: "Ownership" },
      ],
      tracks: [
        { languageCode: "en", baseUrl: expect.stringContaining("lang=en") },
        { languageCode: "fr", baseUrl: expect.stringContaining("lang=fr") },
      ],
    });
  });

  it("returns no tracks when captions are absent", () => {
    expect(parsePlayerResponse({ ...PLAYER_RESPONSE, captions: undefined })?.tracks).toEqual([]);
  });

  it("returns null when the player data has no video", () => {
    expect(parsePlayerResponse({})).toBeNull();
  });
});

describe("pickTrack", () => {
  const tracks = parsePlayerResponse(PLAYER_RESPONSE)?.tracks ?? [];

  it("prefers the track matching the page language on its base code", () => {
    expect(pickTrack(tracks, "fr-FR")?.languageCode).toBe("fr");
  });

  it("falls back to the first track", () => {
    expect(pickTrack(tracks, "de")?.languageCode).toBe("en");
  });
});

describe("isWatchPage", () => {
  it.each([
    ["https://www.youtube.com/watch?v=abc123XYZ00", true],
    ["https://m.youtube.com/watch?v=abc123XYZ00", true],
    ["https://www.youtube.com/", false],
    ["https://www.youtube.com/results?search_query=rust", false],
    ["https://example.com/watch", false],
  ])("%s is a watch page: %s", (url, expected) => {
    expect(isWatchPage(url)).toBe(expected);
  });
});

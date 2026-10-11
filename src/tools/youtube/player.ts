import { asArray, asRecord, asText, dig, toNumber } from "./values";

export interface Chapter {
  startSec: number;
  title: string;
}

export interface CaptionTrack {
  baseUrl: string;
  languageCode: string;
}

export interface VideoInfo {
  title: string;
  channel: string;
  description: string;
  durationSec: number;
  chapters: Chapter[];
  tracks: CaptionTrack[];
}

const MILLIS_PER_SECOND = 1000;

export function parsePlayerResponse(raw: unknown): VideoInfo | null {
  const details = asRecord(dig(raw, "videoDetails"));
  if (!details.videoId) return null;
  return {
    title: asText(details.title),
    channel: asText(details.author),
    description: asText(details.shortDescription),
    durationSec: toNumber(details.lengthSeconds),
    chapters: parseChapters(raw),
    tracks: parseTracks(raw),
  };
}

function parseChapters(raw: unknown): Chapter[] {
  const markers = asArray(
    dig(
      raw,
      "playerOverlays",
      "playerOverlayRenderer",
      "decoratedPlayerBarRenderer",
      "decoratedPlayerBarRenderer",
      "playerBar",
      "multiMarkersPlayerBarRenderer",
      "markersMap",
    ),
  );
  return markers
    .flatMap((marker) => asArray(dig(marker, "value", "chapters")))
    .map((chapter) => ({
      startSec: toNumber(dig(chapter, "chapterRenderer", "timeRangeStartMillis")) / MILLIS_PER_SECOND,
      title: asText(dig(chapter, "chapterRenderer", "title", "simpleText")),
    }))
    .sort((a, b) => a.startSec - b.startSec);
}

function parseTracks(raw: unknown): CaptionTrack[] {
  return asArray(dig(raw, "captions", "playerCaptionsTracklistRenderer", "captionTracks"))
    .map((track) => ({ baseUrl: asText(dig(track, "baseUrl")), languageCode: asText(dig(track, "languageCode")) }))
    .filter((track) => track.baseUrl !== "");
}

const baseLanguage = (languageCode: string): string => (languageCode.split("-")[0] ?? "").toLowerCase();

export function pickTrack(tracks: CaptionTrack[], pageLang: string): CaptionTrack | undefined {
  const language = baseLanguage(pageLang);
  return tracks.find((track) => baseLanguage(track.languageCode) === language) ?? tracks[0];
}

export function isWatchPage(url: string): boolean {
  const { hostname, pathname } = new URL(url);
  return (hostname === "youtube.com" || hostname.endsWith(".youtube.com")) && pathname === "/watch";
}

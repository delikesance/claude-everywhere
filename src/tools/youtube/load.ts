import { parseCaptionJson3, parseCaptionXml, withFormat, type Cue } from "./captions";
import { fetchInTab, readVideoPage, type PlayerPage } from "./browser-page";
import { isWatchPage, parsePlayerResponse, type VideoInfo } from "./player";

export interface LoadedVideo {
  page: PlayerPage;
  video: VideoInfo;
}

export async function loadVideo(tabId: number): Promise<LoadedVideo> {
  const page = await readVideoPage(tabId);
  if (!isWatchPage(page.url)) throw new Error("this tool only works on a youtube.com/watch page");
  const video = parsePlayerResponse(page.player);
  if (!video) throw new Error("the video data is not loaded yet");
  return { page, video };
}

// json3 is preferred; YouTube sometimes answers it with an empty body, so the raw (XML) track is the fallback.
export async function loadCues(tabId: number, baseUrl: string): Promise<Cue[]> {
  const json3 = await fetchInTab(tabId, withFormat(baseUrl, "json3"));
  if (json3.trim()) return parseCaptionJson3(JSON.parse(json3));
  return parseCaptionXml(await fetchInTab(tabId, baseUrl));
}

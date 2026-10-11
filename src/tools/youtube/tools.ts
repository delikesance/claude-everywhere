import type { ToolDef } from "../types";
import { sliceTranscript } from "./captions";
import { loadCues, loadVideo } from "./load";
import { pickTrack, type VideoInfo } from "./player";
import { formatClock } from "./time";

const DESCRIPTION_CHARS = 1500;
const RANGE_ERROR = "fromSec and toSec must be numbers with 0 <= fromSec < toSec";
const NO_TRANSCRIPT = "No transcript is available for this video.";

function describeVideo(video: VideoInfo, currentSec: number | null): string {
  const chapters = video.chapters.map((chapter) => `- [${formatClock(chapter.startSec)}] ${chapter.title}`);
  return [
    `Title: ${video.title}`,
    `Channel: ${video.channel}`,
    `Duration: ${formatClock(video.durationSec)}`,
    `Current time: ${currentSec === null ? "unknown" : formatClock(currentSec)}`,
    `Captions: ${video.tracks.length > 0 ? "available" : "none"}`,
    `Chapters:\n${chapters.join("\n") || "none"}`,
    `Description: ${video.description.slice(0, DESCRIPTION_CHARS)}`,
  ].join("\n");
}

function readRange(input: Record<string, unknown>): { fromSec: number; toSec: number } {
  const fromSec = Number(input.fromSec);
  const toSec = Number(input.toSec);
  if (!Number.isFinite(fromSec) || !Number.isFinite(toSec) || fromSec < 0 || toSec <= fromSec) {
    throw new Error(RANGE_ERROR);
  }
  return { fromSec, toSec };
}

export const videoState: ToolDef = {
  name: "video_state",
  description:
    "Describe the open YouTube video: title, channel, duration, current playback time, chapters, captions availability and description.",
  inputSchema: { type: "object", properties: {} },
  async run(_input, ctx) {
    const { page, video } = await loadVideo(ctx.tabId);
    return describeVideo(video, page.currentTime);
  },
};

export const videoTranscript: ToolDef = {
  name: "video_transcript",
  description: "Read the captions of the open YouTube video between two instants given in seconds, with mm:ss markers.",
  inputSchema: {
    type: "object",
    properties: { fromSec: { type: "number", minimum: 0 }, toSec: { type: "number", minimum: 0 } },
    required: ["fromSec", "toSec"],
  },
  async run(input, ctx) {
    const { fromSec, toSec } = readRange(input);
    const { page, video } = await loadVideo(ctx.tabId);
    const track = pickTrack(video.tracks, page.lang);
    const cues = track ? await loadCues(ctx.tabId, track.baseUrl) : [];
    if (cues.length === 0) return `${NO_TRANSCRIPT}\n${describeVideo(video, page.currentTime)}`;
    const transcript = sliceTranscript(cues, fromSec, toSec);
    return transcript || `No transcript text between ${formatClock(fromSec)} and ${formatClock(toSec)}.`;
  },
};

export const youtubeTools: ToolDef[] = [videoState, videoTranscript];

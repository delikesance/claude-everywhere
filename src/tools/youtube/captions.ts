import { formatClock } from "./time";
import { asArray, asRecord, asText, toNumber } from "./values";

export interface Cue {
  startSec: number;
  text: string;
}

const MARKER_EVERY_SEC = 30;
const TEXT_ELEMENT = /<text\b([^>]*)>([\s\S]*?)<\/text>/g;
const MARKUP = /<[^>]+>/g;
const ENTITY = /&(#\d+|amp|lt|gt|quot);/g;
const NAMED_ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"' };

const collapseSpaces = (text: string): string => text.replace(/\s+/g, " ").trim();

export function parseCaptionJson3(json: unknown): Cue[] {
  return asArray(asRecord(json).events).flatMap((event) => {
    const text = collapseSpaces(
      asArray(asRecord(event).segs)
        .map((segment) => asText(asRecord(segment).utf8))
        .join(""),
    );
    if (!text) return [];
    return [{ startSec: toNumber(asRecord(event).tStartMs) / 1000, text }];
  });
}

function decodeEntities(text: string): string {
  return text.replace(ENTITY, (entity, name: string) =>
    name.startsWith("#") ? String.fromCodePoint(Number(name.slice(1))) : (NAMED_ENTITIES[name] ?? entity),
  );
}

function attribute(attributes: string, name: string): string {
  return new RegExp(`${name}="([^"]*)"`).exec(attributes)?.[1] ?? "";
}

export function parseCaptionXml(xml: string): Cue[] {
  return [...xml.matchAll(TEXT_ELEMENT)].flatMap(([, attributes = "", body = ""]) => {
    const text = collapseSpaces(decodeEntities(body.replace(MARKUP, "")));
    if (!text) return [];
    return [{ startSec: toNumber(attribute(attributes, "start")), text }];
  });
}

export function sliceTranscript(cues: Cue[], fromSec: number, toSec: number): string {
  let bucket = -1;
  let transcript = "";
  for (const cue of cues) {
    if (cue.startSec < fromSec || cue.startSec >= toSec) continue;
    const cueBucket = Math.floor(cue.startSec / MARKER_EVERY_SEC);
    transcript += cueBucket === bucket ? ` ${cue.text}` : `\n[${formatClock(cue.startSec)}] ${cue.text}`;
    bucket = cueBucket;
  }
  return transcript.trim();
}

export function withFormat(baseUrl: string, format: string): string {
  const url = new URL(baseUrl);
  url.searchParams.set("fmt", format);
  return url.toString();
}

import { describe, expect, it } from "vitest";
import { parseCaptionJson3, parseCaptionXml, sliceTranscript, withFormat, type Cue } from "./captions";
import { JSON3_CAPTIONS } from "./fixtures/json3";
import { TIMEDTEXT_XML } from "./fixtures/timedtext";

const CUES: Cue[] = [
  { startSec: 0, text: "a" },
  { startSec: 10, text: "b" },
  { startSec: 31, text: "c" },
  { startSec: 65, text: "d" },
];

describe("parseCaptionJson3", () => {
  it("joins segments per event and drops empty events", () => {
    expect(parseCaptionJson3(JSON3_CAPTIONS)).toEqual([
      { startSec: 0, text: "Bonjour a tous" },
      { startSec: 31, text: "Le pret" },
    ]);
  });
});

describe("parseCaptionXml", () => {
  it("decodes entities and drops blank texts", () => {
    expect(parseCaptionXml(TIMEDTEXT_XML)).toEqual([
      { startSec: 0.5, text: "Tom & Jerry 'hi'" },
      { startSec: 31.2, text: "Next <part>" },
    ]);
  });
});

describe("sliceTranscript", () => {
  it("keeps cues starting in the range and marks each 30 s bucket", () => {
    expect(sliceTranscript(CUES, 0, 60)).toBe("[00:00] a b\n[00:31] c");
  });

  it("excludes cues starting before fromSec or at toSec", () => {
    expect(sliceTranscript(CUES, 10, 31)).toBe("[00:10] b");
  });

  it("returns an empty string when no cue falls in the range", () => {
    expect(sliceTranscript(CUES, 100, 200)).toBe("");
  });
});

describe("withFormat", () => {
  it("sets fmt and keeps the other parameters", () => {
    const url = withFormat("https://www.youtube.com/api/timedtext?v=x&lang=en", "json3");
    expect(new URL(url).searchParams.get("fmt")).toBe("json3");
    expect(new URL(url).searchParams.get("lang")).toBe("en");
  });
});

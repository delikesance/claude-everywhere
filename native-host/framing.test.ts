import { describe, expect, it } from "vitest";
import { MessageReader, encodeMessage } from "./framing.mjs";

describe("native messaging framing", () => {
  it("prefixes the JSON body with its little-endian byte length", () => {
    const frame = encodeMessage({ type: "ping" });
    expect(frame.readUInt32LE(0)).toBe(frame.length - 4);
    expect(frame.subarray(4).toString("utf8")).toBe('{"type":"ping"}');
  });

  it("decodes several messages from one chunk", () => {
    const received: unknown[] = [];
    const reader = new MessageReader((message: unknown) => received.push(message));
    reader.push(Buffer.concat([encodeMessage({ type: "ping" }), encodeMessage({ type: "cancel", requestId: "r1" })]));
    expect(received).toEqual([{ type: "ping" }, { type: "cancel", requestId: "r1" }]);
  });

  it("waits for split chunks, including a split header", () => {
    const received: unknown[] = [];
    const reader = new MessageReader((message: unknown) => received.push(message));
    const frame = encodeMessage({ type: "start", requestId: "r2", prompt: "héllo" });
    reader.push(frame.subarray(0, 2));
    reader.push(frame.subarray(2, 9));
    expect(received).toEqual([]);
    reader.push(frame.subarray(9));
    expect(received).toEqual([{ type: "start", requestId: "r2", prompt: "héllo" }]);
  });
});

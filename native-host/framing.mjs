const HEADER_BYTES = 4;

export function encodeMessage(message) {
  const body = Buffer.from(JSON.stringify(message), "utf8");
  const header = Buffer.alloc(HEADER_BYTES);
  header.writeUInt32LE(body.length, 0);
  return Buffer.concat([header, body]);
}

export class MessageReader {
  #buffer = Buffer.alloc(0);
  #onMessage;

  constructor(onMessage) {
    this.#onMessage = onMessage;
  }

  push(chunk) {
    this.#buffer = Buffer.concat([this.#buffer, chunk]);
    for (let frame = this.#nextFrame(); frame !== null; frame = this.#nextFrame()) {
      this.#onMessage(JSON.parse(frame.toString("utf8")));
    }
  }

  #nextFrame() {
    if (this.#buffer.length < HEADER_BYTES) return null;
    const end = HEADER_BYTES + this.#buffer.readUInt32LE(0);
    if (this.#buffer.length < end) return null;
    const body = this.#buffer.subarray(HEADER_BYTES, end);
    this.#buffer = this.#buffer.subarray(end);
    return body;
  }
}

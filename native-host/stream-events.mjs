import { createInterface } from "node:readline";

const STOP_REASONS = { end_turn: "end_turn", max_tokens: "max_tokens" };
const LOGIN_PATTERN = /log(?:in|ged)|authenticat|\/login/i;

export function mapStreamEvent(event, requestId) {
  if (event.type === "stream_event") return mapDelta(event.event, requestId);
  if (event.type === "result") return mapResult(event, requestId);
  return null;
}

export function classifyFailure(text) {
  return LOGIN_PATTERN.test(text) ? "not_logged_in" : "failed";
}

export function readJsonLines(stream, onEvent) {
  const lines = createInterface({ input: stream, crlfDelay: Infinity });
  lines.on("line", (line) => {
    const event = parseJson(line);
    if (event) onEvent(event);
  });
}

function mapDelta(inner, requestId) {
  if (inner?.type !== "content_block_delta" || inner.delta?.type !== "text_delta") return null;
  return { type: "delta", requestId, text: inner.delta.text };
}

function mapResult(event, requestId) {
  if (event.is_error) {
    const message = event.result ?? "claude a échoué";
    return { type: "error", requestId, code: classifyFailure(message), message };
  }
  return {
    type: "done",
    requestId,
    stopReason: STOP_REASONS[event.stop_reason] ?? "other",
    inputTokens: event.usage?.input_tokens ?? 0,
    outputTokens: event.usage?.output_tokens ?? 0,
  };
}

function parseJson(line) {
  try {
    return JSON.parse(line);
  } catch {
    return null;
  }
}

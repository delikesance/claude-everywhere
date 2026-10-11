import Anthropic, { APIError } from "@anthropic-ai/sdk";
import type { ApiError } from "../shared/types";

const OVERLOADED_STATUS = 529;
const PAYLOAD_TOO_LARGE_STATUS = 413;
const API_KEY_PATTERN = /sk-[\w-]+/g;
const REDACTED = "***";

function retryAfterSeconds(headers: Headers): number | null {
  const seconds = Number.parseFloat(headers.get("retry-after") ?? "");
  return Number.isFinite(seconds) && seconds >= 0 ? seconds : null;
}

function isBadRequest(e: APIError): boolean {
  return (
    e instanceof Anthropic.BadRequestError ||
    e instanceof Anthropic.UnprocessableEntityError ||
    e.status === PAYLOAD_TOO_LARGE_STATUS
  );
}

function mapApiError(e: APIError): ApiError {
  if (e instanceof Anthropic.AuthenticationError || e instanceof Anthropic.PermissionDeniedError) {
    return { kind: "auth" };
  }
  if (e instanceof Anthropic.RateLimitError) return { kind: "rate_limit", retryAfterSec: retryAfterSeconds(e.headers) };
  if (e.status === OVERLOADED_STATUS) return { kind: "overloaded" };
  if (isBadRequest(e)) return { kind: "bad_request", message: e.message.replace(API_KEY_PATTERN, REDACTED) };
  return { kind: "unknown", status: e.status ?? null };
}

function isFetchFailure(e: unknown): boolean {
  return e instanceof TypeError || (e instanceof Error && e.cause instanceof TypeError);
}

export function mapSdkError(e: unknown): ApiError {
  if (e instanceof Anthropic.APIUserAbortError) return { kind: "aborted" };
  if (e instanceof Anthropic.APIConnectionError) return { kind: "network" };
  if (e instanceof APIError) return mapApiError(e);
  if (e instanceof DOMException && e.name === "AbortError") return { kind: "aborted" };
  if (isFetchFailure(e)) return { kind: "network" };
  return { kind: "unknown", status: null };
}

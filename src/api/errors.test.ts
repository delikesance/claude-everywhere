import Anthropic from "@anthropic-ai/sdk";
import { describe, expect, it } from "vitest";
import { mapSdkError } from "./errors";

const apiError = (status: number, headers: Record<string, string> = {}, message = "boom") =>
  Anthropic.APIError.generate(status, { type: "error", error: { type: "x", message } }, message, new Headers(headers));

describe("mapSdkError", () => {
  it.each([401, 403])("maps %i to auth", (status) => {
    expect(mapSdkError(apiError(status))).toEqual({ kind: "auth" });
  });

  it("maps 429 with its retry-after", () => {
    expect(mapSdkError(apiError(429, { "retry-after": "12" }))).toEqual({ kind: "rate_limit", retryAfterSec: 12 });
  });

  it("maps 429 without a usable retry-after to null", () => {
    expect(mapSdkError(apiError(429))).toEqual({ kind: "rate_limit", retryAfterSec: null });
    expect(mapSdkError(apiError(429, { "retry-after": "soon" }))).toEqual({ kind: "rate_limit", retryAfterSec: null });
  });

  it("maps 529 to overloaded", () => {
    expect(mapSdkError(apiError(529))).toEqual({ kind: "overloaded" });
  });

  it.each([400, 413, 422])("maps %i to bad_request", (status) => {
    expect(mapSdkError(apiError(status))).toMatchObject({ kind: "bad_request" });
  });

  it("scrubs key-like strings from bad_request messages", () => {
    const error = mapSdkError(apiError(400, {}, "invalid key sk-ant-api03-SECRET-123"));
    expect(JSON.stringify(error)).not.toContain("SECRET");
  });

  it("keeps the status of other API errors", () => {
    expect(mapSdkError(apiError(500))).toEqual({ kind: "unknown", status: 500 });
  });

  it("maps connection failures and aborts", () => {
    expect(mapSdkError(new Anthropic.APIConnectionError({}))).toEqual({ kind: "network" });
    expect(mapSdkError(new TypeError("fetch failed"))).toEqual({ kind: "network" });
    expect(mapSdkError(new Anthropic.APIUserAbortError())).toEqual({ kind: "aborted" });
    expect(mapSdkError(new DOMException("aborted", "AbortError"))).toEqual({ kind: "aborted" });
  });

  it("maps anything else to unknown", () => {
    expect(mapSdkError("nope")).toEqual({ kind: "unknown", status: null });
  });
});

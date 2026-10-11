import { afterEach, expect, it } from "vitest";
import { formatDate } from "./format";

const TIMESTAMP = Date.UTC(2023, 9, 11, 12);

afterEach(() => {
  document.documentElement.lang = "";
});

it("formats the date in the page language, not the browser locale", () => {
  document.documentElement.lang = "fr";
  expect(formatDate(TIMESTAMP)).toBe("11 octobre");
  document.documentElement.lang = "en";
  expect(formatDate(TIMESTAMP)).toBe("October 11");
});

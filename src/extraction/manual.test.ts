import { describe, expect, it } from "vitest";
import { manualPage } from "./manual";

describe("manualPage", () => {
  it("wraps pasted text as a manual page", () => {
    const page = manualPage("  some pasted text \n", "My note");
    expect(page).toMatchObject({
      sourceType: "manual",
      title: "My note",
      markdown: "some pasted text",
      charCount: 16,
      url: "",
      usedFallback: false,
    });
  });

  it("defaults to an empty title", () => {
    expect(manualPage("x").title).toBe("");
  });
});

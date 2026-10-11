import { beforeAll, describe, expect, it, vi } from "vitest";
import { formatChars, formatDate, formatDateTime } from "./format";
import { initI18n } from "./i18n";

const CATALOG = { shared_charsUnit: "{count} chars" };
const JUNE_3 = new Date(2025, 5, 3, 14, 5);

describe("locale-aware formatting", () => {
  beforeAll(() => {
    vi.stubGlobal("browser", { runtime: { getURL: (path: string) => path } });
    vi.stubGlobal("fetch", async () => ({ json: async () => CATALOG }));
  });

  it("groups digits with the English separator in English", async () => {
    await initI18n("en", CATALOG);
    expect(formatChars(12345)).toBe("12,345 chars");
    expect(formatDate(JUNE_3)).toBe("June 3");
    expect(formatDateTime(JUNE_3)).toContain("Jun 3, 2025");
  });

  it("uses French conventions in French", async () => {
    await initI18n("fr", CATALOG);
    expect(formatChars(12345).replace(/\s/g, " ")).toBe("12 345 chars");
    expect(formatDate(JUNE_3)).toBe("3 juin");
    expect(formatDateTime(JUNE_3)).toContain("3 juin 2025");
  });
});

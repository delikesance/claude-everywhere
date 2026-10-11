import { beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_MODEL, STORAGE_KEYS } from "./constants";
import { DEFAULT_SETTINGS, getSettings, normalizeSettings, patchSettings, redactSettings } from "./settings";
import { installStorageStub } from "./testing/browser-stub";

const SECRET = "sk-ant-secret-value";

describe("settings", () => {
  let store: Map<string, unknown>;
  beforeEach(() => {
    store = installStorageStub();
  });

  it("returns defaults when nothing is stored", async () => {
    expect(await getSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it("round-trips a patch through storage", async () => {
    await patchSettings({ apiKey: SECRET, theme: "dark", maxTokens: 2048 });
    const loaded = await getSettings();
    expect(loaded).toMatchObject({ apiKey: SECRET, theme: "dark", maxTokens: 2048, defaultModel: DEFAULT_MODEL });
    expect(store.has(STORAGE_KEYS.settings)).toBe(true);
  });

  it("falls back to defaults on invalid values and clamps maxTokens", () => {
    const settings = normalizeSettings({ theme: "neon", defaultModel: "gpt", maxTokens: 10_000_000, apiKey: "" });
    expect(settings).toMatchObject({ theme: "system", defaultModel: DEFAULT_MODEL, maxTokens: 64_000, apiKey: null });
  });

  it("redacts the api key and never leaks it", () => {
    const redacted = redactSettings(normalizeSettings({ apiKey: SECRET }));
    expect(redacted.apiKey).toBe("***");
    expect(JSON.stringify(redacted)).not.toContain(SECRET);
    expect(redactSettings(DEFAULT_SETTINGS).apiKey).toBeNull();
  });
});

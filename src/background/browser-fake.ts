import { vi } from "vitest";

export const EXTENSION_ID = "claude-everywhere@test";
export const EXTENSION_URL = "moz-extension://uuid/";

function sessionArea() {
  const store = new Map<string, unknown>();
  return {
    store,
    get: vi.fn(async (key: string) => (store.has(key) ? { [key]: store.get(key) } : {})),
    set: vi.fn(async (items: Record<string, unknown>) => {
      for (const [key, value] of Object.entries(items)) store.set(key, structuredClone(value));
    }),
    remove: vi.fn(async (key: string) => void store.delete(key)),
  };
}

export function installBrowserFake() {
  const local = sessionArea();
  const session = sessionArea();
  const fake = {
    runtime: { id: EXTENSION_ID, getURL: (path: string) => `${EXTENSION_URL}${path}` },
    storage: { local, session },
    tabs: { query: vi.fn(async () => [{ id: 7 }]), sendMessage: vi.fn(async () => undefined), create: vi.fn(async () => ({})) },
    scripting: {
      executeScript: vi.fn(async () => []),
      getRegisteredContentScripts: vi.fn(async () => [] as unknown[]),
      registerContentScripts: vi.fn(async () => undefined),
      unregisterContentScripts: vi.fn(async () => undefined),
    },
    permissions: { contains: vi.fn(async () => true) },
    action: { setBadgeText: vi.fn(async () => undefined) },
    sidebarAction: { open: vi.fn(async () => undefined) },
    contextMenus: { removeAll: vi.fn(async () => undefined), create: vi.fn() },
    i18n: { getUILanguage: () => "fr" },
  };
  Object.assign(globalThis, { browser: fake });
  return fake;
}

export const pageFixture = {
  url: "https://example.org/a",
  title: "A",
  siteName: null,
  lang: "fr",
  sourceType: "page" as const,
  markdown: "# A",
  charCount: 3,
  capturedAt: 1,
  usedFallback: false,
};

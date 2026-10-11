import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { changedTab, watchActiveTab, watchTabChanges } from "./tabWatch";

type Listener = (...args: never[]) => unknown;

function listenerSet() {
  const listeners = new Set<Listener>();
  return {
    listeners,
    addListener: vi.fn((fn: Listener) => listeners.add(fn)),
    removeListener: vi.fn((fn: Listener) => listeners.delete(fn)),
  };
}

const tabs = vi.hoisted(() => ({ get: vi.fn() }));

describe("watchActiveTab", () => {
  let onActivated: ReturnType<typeof listenerSet>;
  let onUpdated: ReturnType<typeof listenerSet>;

  beforeEach(() => {
    onActivated = listenerSet();
    onUpdated = listenerSet();
    tabs.get.mockReset();
    vi.stubGlobal("browser", {
      runtime: { getURL: (path: string) => `moz-extension://test-uuid/${path}` },
      tabs: { ...tabs, onActivated, onUpdated },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("reports the tab when the user switches to it", async () => {
    tabs.get.mockResolvedValue({ id: 2, title: "Le Monde", url: "https://lemonde.fr/a" });
    const onChange = vi.fn();
    watchActiveTab(onChange);

    const [activated] = [...onActivated.listeners] as Array<(info: { tabId: number }) => Promise<void>>;
    await activated!({ tabId: 2 });

    expect(tabs.get).toHaveBeenCalledWith(2);
    expect(onChange).toHaveBeenCalledWith({ title: "Le Monde", url: "https://lemonde.fr/a" });
  });

  it("reports the active tab when its url changes", () => {
    const onChange = vi.fn();
    watchActiveTab(onChange);

    const [updated] = [...onUpdated.listeners] as Array<(id: number, change: { url?: string }, tab: object) => void>;
    updated!(3, { url: "https://example.org" }, { active: true, title: "Example", url: "https://example.org" });

    expect(onChange).toHaveBeenCalledWith({ title: "Example", url: "https://example.org" });
  });

  it("reports no tab when the active one is an extension page", async () => {
    tabs.get.mockResolvedValue({ id: 6, title: "Options", url: "moz-extension://test-uuid/options.html" });
    const onChange = vi.fn();
    watchActiveTab(onChange);

    const [activated] = [...onActivated.listeners] as Array<(info: { tabId: number }) => Promise<void>>;
    await activated!({ tabId: 6 });

    expect(onChange).toHaveBeenCalledWith(null);
  });

  it("ignores url changes of background tabs", () => {
    const onChange = vi.fn();
    watchActiveTab(onChange);

    const [updated] = [...onUpdated.listeners] as Array<(id: number, change: { url?: string }, tab: object) => void>;
    updated!(4, { url: "https://example.org" }, { active: false, title: "Other", url: "https://example.org" });

    expect(onChange).not.toHaveBeenCalled();
  });

  it("ignores activation of a tab that was closed meanwhile", async () => {
    tabs.get.mockRejectedValue(new Error("No tab with id: 9"));
    const onChange = vi.fn();
    watchActiveTab(onChange);

    const [activated] = [...onActivated.listeners] as Array<(info: { tabId: number }) => Promise<void>>;
    await activated!({ tabId: 9 });

    expect(onChange).not.toHaveBeenCalled();
  });

  it("exposes the switched-to tab as the changed tab", async () => {
    tabs.get.mockResolvedValue({ id: 5, title: "Le Monde", url: "https://lemonde.fr/b" });
    watchTabChanges();

    const [activated] = [...onActivated.listeners] as Array<(info: { tabId: number }) => Promise<void>>;
    await activated!({ tabId: 5 });

    expect(changedTab.value).toEqual({ title: "Le Monde", url: "https://lemonde.fr/b" });
    changedTab.value = null;
  });

  it("removes both listeners when stopped", () => {
    const stop = watchActiveTab(vi.fn());
    stop();

    expect(onActivated.listeners.size).toBe(0);
    expect(onUpdated.listeners.size).toBe(0);
  });
});

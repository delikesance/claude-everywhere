import type { ComponentChild } from "preact";
import { render } from "preact";
import { act } from "preact/test-utils";
import { vi } from "vitest";
import type { Library } from "../library";
import optionsFr from "../options/locales/fr.json";
import { initI18n } from "../shared/i18n";
import sharedFr from "../shared/locales/fr.json";
import { installStorageStub } from "../shared/testing/browser-stub";
import libraryFr from "./locales/fr.json";

export async function initFrench(): Promise<void> {
  await initI18n("fr", { ...sharedFr, ...libraryFr, ...optionsFr });
}

export async function mount(page: ComponentChild): Promise<HTMLElement> {
  const container = document.createElement("div");
  document.body.append(container);
  await act(() => render(page, container));
  return container;
}

export async function settle(ms = 0): Promise<void> {
  await act(() => new Promise<void>((resolve) => setTimeout(resolve, ms)));
}

export async function click(element: Element | null): Promise<void> {
  await act(() => (element as HTMLElement).click());
  await settle();
}

export async function typeInto(input: HTMLInputElement, value: string): Promise<void> {
  input.value = value;
  await act(() => {
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

export function byText(root: ParentNode, selector: string, text: string): HTMLElement | null {
  return [...root.querySelectorAll<HTMLElement>(selector)].find((node) => node.textContent?.includes(text)) ?? null;
}

export function installBrowserStub(extra: Record<string, unknown> = {}): Map<string, unknown> {
  const store = installStorageStub();
  const session = { set: vi.fn(async () => undefined) };
  Object.assign((globalThis as unknown as { browser: object }).browser, {
    storage: { local: (globalThis as unknown as { browser: { storage: { local: object } } }).browser.storage.local, session },
    sidebarAction: { open: vi.fn(async () => undefined) },
    ...extra,
  });
  return store;
}

export function fakeLibrary(overrides: Partial<Library> = {}): Library {
  return {
    listArtifacts: vi.fn(async () => []),
    search: vi.fn(async () => []),
    onChange: vi.fn(() => () => undefined),
    ...overrides,
  } as unknown as Library;
}

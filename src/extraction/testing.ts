import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export const FIXTURES_DIR = resolve(import.meta.dirname, "../../tests/fixtures");

export function readFixture(name: string): Buffer {
  return readFileSync(resolve(FIXTURES_DIR, name));
}

export function loadHtmlFixture(name: string, path = "/"): void {
  const parsed = new DOMParser().parseFromString(readFixture(name).toString("utf8"), "text/html");
  document.documentElement.innerHTML = parsed.documentElement.innerHTML;
  document.documentElement.lang = parsed.documentElement.lang;
  history.replaceState(null, "", path);
}

/** Node 22 lacks APIs that Firefox 140 ships and pdfjs requires. */
export function polyfillFirefoxRuntime(): void {
  const hex = (bytes: Uint8Array) => Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  const tryCall = (fn: (...args: unknown[]) => unknown, ...args: unknown[]) =>
    new Promise((resolvePromise) => resolvePromise(fn(...args)));
  Object.assign(Promise, { try: Reflect.get(Promise, "try") ?? tryCall });
  Object.assign(Uint8Array.prototype, {
    toHex(this: Uint8Array) {
      return hex(this);
    },
  });
}

export function stubInnerText(): void {
  Object.defineProperty(HTMLElement.prototype, "innerText", {
    configurable: true,
    get(this: HTMLElement) {
      const copy = this.cloneNode(true) as HTMLElement;
      copy.querySelectorAll("script, style").forEach((node) => node.remove());
      return copy.textContent ?? "";
    },
  });
}

import { sendRequest } from "../shared/messaging";
import type { TabMessage } from "../shared/messages";
import { initOverlayI18n } from "./i18n";
import { createOverlay } from "./overlay";
import type { Overlay } from "./overlay";
import { createSurface } from "./surface";

const MOUNT_GUARD = Symbol.for("claude-everywhere.overlay");

const loadConfig = () => sendRequest("overlay/config", {});

function isShowMessage(message: unknown): boolean {
  return (message as TabMessage | null)?.type === "overlay/show";
}

function listen(overlay: Overlay, hostElement: Element): void {
  const fromHost = (event: Event) => event.composedPath().includes(hostElement);
  const refresh = (event: Event) => {
    if (!fromHost(event)) setTimeout(overlay.refreshToolbar);
  };
  document.addEventListener("mouseup", refresh);
  document.addEventListener("keyup", refresh);
  document.addEventListener(
    "pointerdown",
    (event) => {
      if (overlay.isCardOpen() && !fromHost(event)) overlay.dismiss();
    },
    true,
  );
  window.addEventListener(
    "keydown",
    (event) => {
      if (event.key === "Escape") overlay.dismiss();
    },
    true,
  );
  browser.runtime.onMessage.addListener((message: unknown) => {
    if (isShowMessage(message)) void overlay.openFromSelection();
  });
}

export async function mountOverlay(): Promise<void> {
  if (Reflect.has(window, MOUNT_GUARD)) return;
  Reflect.set(window, MOUNT_GUARD, true);
  const locale = await loadConfig().then((config) => config.uiLocale, () => "auto" as const);
  await initOverlayI18n(locale);
  const surface = createSurface();
  listen(createOverlay(surface, loadConfig), surface.host);
}

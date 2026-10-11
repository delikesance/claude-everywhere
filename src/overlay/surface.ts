import { OVERLAY_CSS } from "./styles";

export const HOST_TAG = "claude-everywhere-overlay";

export interface Surface {
  host: HTMLElement;
  show(content: Node): void;
  clear(): void;
}

function adoptStyles(root: ShadowRoot): void {
  try {
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(OVERLAY_CSS);
    root.adoptedStyleSheets = [sheet];
  } catch {
    const style = document.createElement("style");
    style.textContent = OVERLAY_CSS;
    root.append(style);
  }
}

export function createSurface(): Surface {
  const host = document.createElement(HOST_TAG);
  host.popover = "manual";
  const root = host.attachShadow({ mode: "closed" });
  adoptStyles(root);
  const stage = document.createElement("div");
  root.append(stage);
  document.documentElement.append(host);
  let open = false;

  const hide = () => {
    if (open) host.hidePopover();
    open = false;
  };

  return {
    host,
    show(content) {
      stage.replaceChildren(content);
      // Hiding then showing moves the popover back to the top of the top layer, above page dialogs.
      hide();
      host.showPopover();
      open = true;
    },
    clear() {
      stage.replaceChildren();
      hide();
    },
  };
}

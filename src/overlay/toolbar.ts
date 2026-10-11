import { t } from "../shared/i18n";
import { actionButton, el } from "./dom";

export function buildToolbar(onExplain: () => void): HTMLElement {
  const toolbar = el("div", "toolbar", actionButton(t("overlay_ask"), "primary", onExplain));
  toolbar.setAttribute("role", "toolbar");
  toolbar.setAttribute("aria-label", t("overlay_toolbarLabel"));
  return toolbar;
}

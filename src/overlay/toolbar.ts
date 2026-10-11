import { el, textButton } from "./dom";
import { t } from "../shared/i18n";

export function buildToolbar(onExplain: () => void): HTMLElement {
  const toolbar = el("div", "toolbar", textButton(t("overlay_ask"), "egress", onExplain));
  toolbar.setAttribute("role", "toolbar");
  toolbar.setAttribute("aria-label", t("overlay_toolbarLabel"));
  return toolbar;
}

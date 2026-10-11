import { renderSafeMarkdown } from "../shared/render-markdown";
import { formatChars } from "../shared/format";
import { t } from "../shared/i18n";
import { closeButton, el, icon, relabel, textButton } from "./dom";

export type NoticeKind = "warning" | "error";

export interface CardActions {
  explain(): void;
  copy(): void;
  save(): void;
  panel(): void;
  close(): void;
}

export interface CardView {
  element: HTMLElement;
  setSentChars(count: number | null): void;
  setAnswer(markdown: string, streaming: boolean): void;
  setWriting(writing: boolean): void;
  setRetryVisible(visible: boolean): void;
  setResultActionsVisible(visible: boolean): void;
  setCopied(): void;
  setSaved(): void;
  showNotice(kind: NoticeKind, body: string, title?: string): void;
  clearNotice(): void;
  setHint(text: string): void;
  focus(): void;
}

const NOTICE_ICON = { warning: "triangleAlert", error: "circleAlert" } as const;

function notice(kind: NoticeKind, body: string, title?: string): HTMLElement {
  const text = el("div", "notice__text");
  if (title) text.append(el("p", "notice__title", title));
  text.append(el("p", "notice__body", body));
  const element = el("div", `notice notice--${kind}`, el("span", "notice__icon", icon(NOTICE_ICON[kind])), text);
  element.setAttribute("role", kind === "error" ? "alert" : "status");
  return element;
}

export function buildCard(quote: string, actions: CardActions): CardView {
  const quoteBox = el("blockquote", "overlay-card__quote sent", quote);
  const noticeSlot = el("div", "");
  const answer = el("div", "reading reading--compact md");
  answer.setAttribute("aria-live", "polite");
  const hint = el("p", "caption");
  hint.setAttribute("role", "status");
  const body = el("div", "overlay-card__body", noticeSlot, answer, hint);

  const status = el("span", "status-tag");
  status.setAttribute("role", "status");
  status.hidden = true;
  const retry = textButton(t("overlay_ask"), "egress", actions.explain);
  retry.hidden = true;
  const copy = textButton(t("overlay_copy"), "copy", actions.copy);
  const save = textButton(t("overlay_save"), "bookmarkPlus", actions.save);
  const panel = textButton(t("overlay_panel"), "arrowUpRight", actions.panel);
  panel.classList.replace("btn--quiet", "btn--primary");
  const resultActions = [copy, save, panel];
  const foot = el(
    "div",
    "overlay-card__foot",
    status,
    el("span", "grow"),
    retry,
    ...resultActions,
    closeButton(t("shared_close"), actions.close),
  );

  const element = el("div", "overlay-card anim-pop", quoteBox, body, foot);
  element.setAttribute("role", "dialog");
  element.setAttribute("aria-label", t("overlay_dialogLabel"));
  element.tabIndex = -1;

  const setResultActionsVisible = (visible: boolean) => resultActions.forEach((button) => (button.hidden = !visible));
  setResultActionsVisible(false);

  return {
    element,
    setSentChars(count) {
      status.hidden = count === null;
      if (count !== null) status.textContent = t("overlay_sent", { chars: formatChars(count) });
    },
    setAnswer(markdown, streaming) {
      answer.replaceChildren(renderSafeMarkdown(markdown));
      if (streaming) answer.append(el("span", "caret"));
    },
    setWriting(writing) {
      answer.setAttribute("aria-busy", String(writing));
      if (writing && !answer.hasChildNodes()) answer.append(el("span", "ellipsis", t("overlay_writing").replace("…", "")));
    },
    setRetryVisible(visible) {
      retry.hidden = !visible;
    },
    setResultActionsVisible,
    setCopied: () => relabel(copy, t("overlay_copied")),
    setSaved: () => relabel(save, t("overlay_saved")),
    showNotice: (kind, text, title) => noticeSlot.replaceChildren(notice(kind, text, title)),
    clearNotice: () => noticeSlot.replaceChildren(),
    setHint: (text) => void (hint.textContent = text),
    focus: () => element.focus(),
  };
}

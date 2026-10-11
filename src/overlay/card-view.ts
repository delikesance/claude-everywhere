import { formatChars } from "../shared/format";
import { t } from "../shared/i18n";
import { renderSafeMarkdown } from "../shared/render-markdown";
import { actionButton, closeButton, el, icon, relabel } from "./dom";

export type NoticeKind = "warning" | "error";

export interface NoticeContent {
  kind: NoticeKind;
  body?: string;
  title?: string;
  action?: { label: string; onClick: () => void };
}

export interface CardActions {
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
  setFootVisible(visible: boolean): void;
  setCopied(): void;
  setSaved(): void;
  showNotice(content: NoticeContent): void;
  clearNotice(): void;
  focus(): void;
}

const NOTICE_ICON = { warning: "triangleAlert", error: "circleAlert" } as const;

function dots(): HTMLElement {
  return el("span", "anim-dots", el("span", ""), el("span", ""), el("span", ""));
}

function noticeElement({ kind, body, title, action }: NoticeContent): HTMLElement {
  const content = el("div", "");
  if (title) content.append(el("p", "notice__title", title));
  if (body) content.append(el("p", "notice__body", body));
  if (action) content.append(el("div", "notice__actions", actionButton(action.label, "secondary", action.onClick)));
  const element = el("div", `notice notice--${kind}`, el("span", "notice__icon", icon(NOTICE_ICON[kind])), content);
  element.setAttribute("role", kind === "error" ? "alert" : "status");
  return element;
}

export function buildCard(quote: string, actions: CardActions): CardView {
  const head = el(
    "div",
    "overlay-card__head",
    el("span", "grow", t("overlay_cardTitle")),
    closeButton(t("shared_close"), actions.close),
  );
  const quoteBox = el("blockquote", "overlay-card__quote sent", quote);
  const sent = el("p", "overlay-card__sent");
  sent.hidden = true;
  const noticeSlot = el("div", "");
  const waiting = el("p", "reading reading--compact", dots(), ` ${t("overlay_writing")}`);
  waiting.setAttribute("role", "status");
  waiting.hidden = true;
  const answer = el("div", "reading reading--compact md");
  answer.setAttribute("aria-live", "polite");
  const body = el("div", "overlay-card__body", noticeSlot, waiting, answer);

  const panel = actionButton(t("overlay_panel"), "primary", actions.panel);
  const copy = actionButton(t("overlay_copy"), "quiet", actions.copy, "copy");
  const save = actionButton(t("overlay_save"), "quiet", actions.save, "bookmarkPlus");
  const foot = el("div", "overlay-card__foot", panel, copy, save);
  foot.hidden = true;

  const element = el("div", "overlay-card anim-pop", head, quoteBox, sent, body, foot);
  element.setAttribute("role", "dialog");
  element.setAttribute("aria-label", t("overlay_dialogLabel"));
  element.tabIndex = -1;

  return {
    element,
    setSentChars(count) {
      sent.hidden = count === null;
      if (count !== null) sent.textContent = t("overlay_sent", { chars: formatChars(count) });
    },
    setAnswer(markdown, streaming) {
      waiting.hidden = true;
      answer.replaceChildren(renderSafeMarkdown(markdown));
      if (streaming) answer.append(el("span", "caret"));
    },
    setWriting(writing) {
      answer.setAttribute("aria-busy", String(writing));
      waiting.hidden = !writing;
      foot.hidden = false;
      [panel, copy, save].forEach((button) => (button.disabled = writing));
    },
    setFootVisible(visible) {
      foot.hidden = !visible;
    },
    setCopied: () => relabel(copy, t("overlay_copied")),
    setSaved() {
      save.replaceChildren(icon("check"), t("overlay_saved"));
      save.setAttribute("aria-pressed", "true");
    },
    showNotice: (content) => noticeSlot.replaceChildren(noticeElement(content)),
    clearNotice: () => noticeSlot.replaceChildren(),
    focus: () => element.focus(),
  };
}

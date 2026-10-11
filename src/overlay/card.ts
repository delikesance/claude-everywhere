import { planContext } from "../api/budget";
import { formatChars, formatNumber } from "../shared/format";
import { t } from "../shared/i18n";
import type { RequestMap } from "../shared/messages";
import type { ContextItem } from "../shared/types";
import { continueInPanel, copyText, saveAnswer } from "./actions";
import { buildCard } from "./card-view";
import { errorText, startExplain } from "./explain";
import { placeNear } from "./position";
import type { PageSelection } from "./selection";
import type { Surface } from "./surface";

export type OverlayConfig = RequestMap["overlay/config"]["res"];

const CARD_WIDTH_PX = 340;

export interface OpenCard {
  close(): void;
}

function selectionItem(text: string): ContextItem {
  return {
    id: "overlay-selection",
    kind: "selection",
    title: document.title || t("overlay_selectionTitle"),
    url: location.href,
    text,
    included: true,
    status: "ready",
  };
}

export function openCard(surface: Surface, selection: PageSelection, config: OverlayConfig, onClosed: () => void): OpenCard {
  const item = selectionItem(selection.text);
  const previousFocus = document.activeElement;
  const prompt = t("overlay_explainPrompt");
  let answer = "";
  let abort: (() => void) | null = null;

  const close = () => {
    abort?.();
    surface.clear();
    if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
    onClosed();
  };

  const runAction = async (action: () => Promise<void>, onSuccess?: () => void) => {
    try {
      await action();
      onSuccess?.();
    } catch {
      view.showNotice({ kind: "error", body: t("overlay_actionFailed") });
    }
  };

  const panel = () => void runAction(continueInPanel);

  const explain = () => {
    view.clearNotice();
    view.setWriting(true);
    abort = startExplain(
      { items: [item], model: config.defaultModel, userText: prompt, answerLanguage: config.answerLanguage },
      {
        onDelta(accumulated) {
          answer = accumulated;
          view.setAnswer(answer, true);
        },
        onDone() {
          view.setWriting(false);
          view.setAnswer(answer, false);
        },
        onError(error) {
          view.setWriting(false);
          if (error.kind === "aborted") return;
          if (!answer) view.setFootVisible(false);
          view.showNotice({ kind: "error", body: errorText(error) });
        },
      },
    );
  };

  const view = buildCard(selection.text, {
    copy: () => void runAction(() => copyText(answer), view.setCopied),
    save: () => void runAction(() => saveAnswer(answer), view.setSaved),
    panel,
    close,
  });

  if (config.hasKey) {
    explain();
    const { bordereau } = planContext([item], prompt, config.defaultModel);
    view.setSentChars(bordereau.sentChars);
    if (bordereau.truncated) {
      view.showNotice({
        kind: "warning",
        title: t("overlay_truncated", { sent: formatChars(bordereau.sentChars), total: formatNumber(bordereau.totalChars) }),
      });
    }
  } else {
    view.showNotice({
      kind: "error",
      title: t("overlay_noKeyTitle"),
      body: t("overlay_noKeyBody"),
      action: { label: t("overlay_openPanel"), onClick: panel },
    });
  }

  placeNear(view.element, selection.rect, CARD_WIDTH_PX);
  surface.show(view.element);
  view.focus();
  return { close };
}

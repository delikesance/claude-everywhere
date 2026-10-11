import { t } from "../shared/i18n";
import { sendRequest } from "../shared/messaging";

export function copyText(text: string): Promise<void> {
  return navigator.clipboard.writeText(text);
}

export async function saveAnswer(markdown: string): Promise<void> {
  await sendRequest("artifact/save", {
    draft: {
      title: document.title || t("overlay_selectionTitle"),
      url: location.href,
      sourceType: "selection",
      tags: [],
      markdown,
    },
  });
}

export async function continueInPanel(): Promise<void> {
  await sendRequest("capture/run", { mode: "selection", handoff: true });
}

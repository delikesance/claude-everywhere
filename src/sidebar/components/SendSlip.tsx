import { useState } from "preact/hooks";
import { formatChars } from "../../shared/format";
import { t } from "../../shared/i18n";
import type { Bordereau } from "../../shared/types";
import { Icon } from "../../shared/ui";
import { draft } from "../state/conversation";
import { currentPlan, currentPrompt, sentHistory } from "../state/plan";
import type { ContextPlan } from "../../api/budget";
import { LongDocumentNotice } from "./LongDocumentNotice";

function PromptPreview({ plan }: { plan: ContextPlan }) {
  const [open, setOpen] = useState(false);
  const prompt = open ? currentPrompt(plan) : null;
  return (
    <>
      <button type="button" class="btn btn--quiet btn--compact" aria-expanded={open} onClick={() => setOpen(!open)}>
        {open ? t("sidebar_previewHide") : t("sidebar_previewShow")}
      </button>
      {prompt && (
        <pre class="preview">
          {t("sidebar_previewSystem")}
          {"\n"}
          {prompt.system}
          {"\n\n"}
          {t("sidebar_previewUser")}
          {"\n"}
          {prompt.user}
        </pre>
      )}
    </>
  );
}

function historyLabel(): string[] {
  const count = sentHistory().length;
  if (count === 0) return [];
  return [t(count === 1 ? "sidebar_slipHistoryOne" : "sidebar_slipHistoryMany", { count })];
}

function pillLabel(bordereau: Bordereau): string {
  if (bordereau.lines.length > 0) {
    const items = [...bordereau.lines.map((line) => line.title), ...historyLabel()].join(" + ");
    return t("sidebar_slipPart", { items });
  }
  return t(draft.value === "" ? "sidebar_slipEmpty" : "sidebar_slipMessageOnly");
}

export function SendSlip() {
  const [open, setOpen] = useState(false);
  const plan = currentPlan.value;
  const { bordereau } = plan;
  if (bordereau.lines.length === 0) {
    return (
      <p class="slip caption">
        <span class="sb-pill clamp-1">{pillLabel(bordereau)}</span>
      </p>
    );
  }
  return (
    <>
      <LongDocumentNotice />
      <div class="slip">
        <button type="button" class="slip__toggle" aria-expanded={open} onClick={() => setOpen(!open)}>
          <span class="sb-pill clamp-1">{pillLabel(bordereau)}</span>
          <Icon name="chevronDown" />
        </button>
        <div class="slip__body" data-open={open ? "true" : "false"}>
          <div class="slip__inner">
            {bordereau.lines.map((line) => (
              <div class="slip__line sent" key={line.itemId}>
                <span class="grow">{line.title}</span>
                <span>{formatChars(line.sentChars)}</span>
              </div>
            ))}
            <p class="caption">{t("sidebar_slipTokens", { tokens: bordereau.estimatedTokens.toLocaleString("fr-FR") })}</p>
            <p class="overline">{t("sidebar_slipDestination")}</p>
            <PromptPreview plan={plan} />
          </div>
        </div>
      </div>
    </>
  );
}

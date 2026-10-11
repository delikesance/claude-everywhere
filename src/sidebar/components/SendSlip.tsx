import { useState } from "preact/hooks";
import { t } from "../../shared/i18n";
import { Slip } from "../../shared/ui";
import { draft } from "../state/conversation";
import { currentPlan, currentPrompt } from "../state/plan";
import type { ContextPlan } from "../../api/budget";

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

export function SendSlip() {
  const plan = currentPlan.value;
  const { bordereau } = plan;
  if (bordereau.lines.length === 0) {
    return <p class="slip caption">{draft.value === "" ? t("sidebar_slipEmpty") : t("sidebar_slipMessageOnly")}</p>;
  }
  return (
    <Slip bordereau={bordereau}>
      <p class="caption">{t("sidebar_slipTokens", { tokens: bordereau.estimatedTokens.toLocaleString("fr-FR") })}</p>
      <p class="overline">{t("sidebar_slipDestination")}</p>
      <PromptPreview plan={plan} />
    </Slip>
  );
}

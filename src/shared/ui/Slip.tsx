import type { ComponentChildren } from "preact";
import { useState } from "preact/hooks";
import { formatChars } from "../format";
import { t } from "../i18n";
import type { Bordereau } from "../types";
import { Icon } from "./Icon";

export interface SlipProps {
  bordereau: Bordereau;
  children?: ComponentChildren;
}

export function Slip({ bordereau, children }: SlipProps) {
  const [open, setOpen] = useState(false);
  const summary = t("shared_slipSummary", {
    sent: formatChars(bordereau.sentChars),
    total: formatChars(bordereau.totalChars),
  });
  return (
    <div class="slip">
      <button type="button" class="slip__toggle" aria-expanded={open} onClick={() => setOpen(!open)}>
        {t("shared_slipTitle")}&#8239;: {summary}
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
          {bordereau.truncated && <p class="help">{t("shared_slipTruncated")}</p>}
          {children}
        </div>
      </div>
    </div>
  );
}

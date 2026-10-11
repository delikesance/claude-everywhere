import { t } from "../../shared/i18n";
import type { ChatMessage } from "../../shared/types";

export function ToolTrace({ calls }: { calls: NonNullable<ChatMessage["toolCalls"]> }) {
  if (calls.length === 0) return null;
  return (
    <div class="tool-trace">
      <p class="caption">{t("sidebar_toolsLabel")}</p>
      <ul>
        {calls.map((call, index) => (
          <li key={index}>
            {call.name} · {t("sidebar_toolChars", { chars: call.resultChars })}
          </li>
        ))}
      </ul>
    </div>
  );
}

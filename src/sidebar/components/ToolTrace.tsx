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
            <span class="tool-trace__name">{call.name}</span>
            <span class="muted">{t("sidebar_toolChars", { chars: call.resultChars })}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

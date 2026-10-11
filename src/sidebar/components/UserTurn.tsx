import { formatChars } from "../../shared/format";
import { t } from "../../shared/i18n";
import type { ChatMessage } from "../../shared/types";
import { UserMessage } from "../../shared/ui";
import { formatTime } from "../format";

export function UserTurn({ message }: { message: ChatMessage }) {
  const { bordereau } = message;
  return (
    <UserMessage label={t("sidebar_yourMessage")}>
      <p>{message.text}</p>
      {bordereau && (
        <details class="receipt">
          <summary>
            {t("sidebar_receipt", {
              time: formatTime(message.createdAt),
              chars: bordereau.lines.length ? formatChars(bordereau.sentChars) : t("sidebar_receiptNoContext"),
            })}
          </summary>
          {bordereau.lines.map((line) => (
            <div class="slip__line sent" key={line.itemId}>
              <span class="grow">{line.title}</span>
              <span>{formatChars(line.sentChars)}</span>
            </div>
          ))}
        </details>
      )}
    </UserMessage>
  );
}

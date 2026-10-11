import { useState } from "preact/hooks";
import { t } from "../shared/i18n";
import type { MessageKey } from "../shared/i18n";
import { Icon, Notice } from "../shared/ui";

export type Status = { kind: "success" | "error"; message: string } | null;

export function useStatus() {
  const [status, setStatus] = useState<Status>(null);
  /** Starts the task synchronously so calls that need the user gesture (sidebar open) stay inside the click. */
  const run = (task: () => Promise<unknown> | void, successKey: MessageKey) => {
    new Promise((resolve) => resolve(task())).then(
      () => setStatus({ kind: "success", message: t(successKey) }),
      () => setStatus({ kind: "error", message: t("library_ui_actionFailed") }),
    );
  };
  return { status, run };
}

export function StatusLine({ status }: { status: Status }) {
  if (!status) return <p role="status" />;
  if (status.kind === "error") return <Notice tone="error" title={status.message} />;
  return (
    <p class="inline-confirm" role="status">
      <Icon name="check" />
      {status.message}
    </p>
  );
}

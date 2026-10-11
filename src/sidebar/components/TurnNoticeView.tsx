import { t } from "../../shared/i18n";
import type { MessageKey } from "../../shared/i18n";
import { Button, Notice } from "../../shared/ui";
import type { NoticeTone } from "../../shared/ui/Notice";
import { continueAnswer, retry } from "../state/turn";
import type { TurnNotice } from "../state/turn";
import { openOptions } from "./actions";
import { useCountdown } from "./hooks";

type NoticeAction = "settings" | "retry" | "continue";

interface NoticeSpec {
  tone: NoticeTone;
  role?: "status" | "alert";
  title: MessageKey;
  body?: MessageKey;
  action?: NoticeAction;
}

const SPECS: Record<TurnNotice["kind"], NoticeSpec> = {
  no_key: { tone: "warning", title: "sidebar_noKeyTitle", action: "settings" },
  auth: { tone: "error", title: "sidebar_errAuthTitle", body: "sidebar_errAuthBody", action: "settings" },
  rate_limit: { tone: "warning", role: "alert", title: "sidebar_errRateTitle", action: "retry" },
  overloaded: { tone: "warning", title: "sidebar_errOverloadedTitle", body: "sidebar_errOverloadedBody", action: "retry" },
  network: { tone: "error", title: "sidebar_errNetworkTitle", body: "sidebar_errNetworkBody", action: "retry" },
  bad_request: { tone: "error", title: "sidebar_errBadRequestTitle" },
  unknown: { tone: "error", title: "sidebar_errUnknownTitle", body: "sidebar_errUnknownBody", action: "retry" },
  max_tokens: { tone: "info", title: "sidebar_maxTitle", body: "sidebar_maxBody", action: "continue" },
  refusal: { tone: "info", title: "sidebar_refusalTitle", body: "sidebar_refusalBody" },
  interrupted: { tone: "info", title: "sidebar_interruptedTitle", body: "sidebar_interruptedBody" },
};

const ACTION_LABEL: Record<NoticeAction, MessageKey> = {
  settings: "sidebar_openSettings",
  retry: "sidebar_retry",
  continue: "sidebar_continue",
};

const ACTION_HANDLER: Record<NoticeAction, () => void> = {
  settings: openOptions,
  retry,
  continue: continueAnswer,
};

function titleOf(notice: TurnNotice, spec: NoticeSpec): string {
  return t(spec.title, notice.kind === "interrupted" ? { words: notice.words } : {});
}

function bodyOf(notice: TurnNotice, spec: NoticeSpec, remaining: number): string | undefined {
  if (notice.kind === "bad_request") return notice.message;
  if (notice.kind === "rate_limit") {
    return remaining > 0 ? t("sidebar_errRateBody", { seconds: remaining }) : t("sidebar_errRateBodyReady");
  }
  return spec.body && t(spec.body);
}

export function TurnNoticeView({ notice }: { notice: TurnNotice }) {
  const spec = SPECS[notice.kind];
  const remaining = useCountdown(notice.kind === "rate_limit" ? notice.retryAfterSec : null);
  const action = spec.action;
  return (
    <Notice
      tone={spec.tone}
      role={spec.role}
      title={titleOf(notice, spec)}
      actions={
        action && (
          <Button compact disabled={action === "retry" && remaining > 0} onClick={ACTION_HANDLER[action]}>
            {t(ACTION_LABEL[action])}
          </Button>
        )
      }
    >
      {bodyOf(notice, spec, remaining)}
    </Notice>
  );
}

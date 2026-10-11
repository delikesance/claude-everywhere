import type { ComponentChildren } from "preact";
import { cx } from "./cx";
import { Icon } from "./Icon";
import type { IconName } from "./icon-shapes";

export type NoticeTone = "info" | "success" | "warning" | "error";

const TONE_ICON: Record<NoticeTone, IconName> = {
  info: "info",
  success: "check",
  warning: "triangleAlert",
  error: "circleAlert",
};

export interface NoticeProps {
  tone?: NoticeTone;
  title: string;
  children?: ComponentChildren;
  actions?: ComponentChildren;
}

export function Notice({ tone = "info", title, children, actions }: NoticeProps) {
  return (
    <div class={cx("notice", tone !== "info" && `notice--${tone}`)} role={tone === "error" ? "alert" : "status"}>
      <span class="notice__icon">
        <Icon name={TONE_ICON[tone]} />
      </span>
      <div>
        <p class="notice__title">{title}</p>
        {children && <p class="notice__body">{children}</p>}
        {actions && <div class="notice__actions">{actions}</div>}
      </div>
    </div>
  );
}

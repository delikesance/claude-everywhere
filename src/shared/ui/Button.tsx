import type { ComponentChildren, ComponentProps } from "preact";
import { cx } from "./cx";
import { Icon } from "./Icon";
import type { IconName } from "./icon-shapes";

export type ButtonVariant = "primary" | "secondary" | "quiet" | "danger" | "danger-solid";

export interface ButtonProps {
  variant?: ButtonVariant;
  compact?: boolean;
  large?: boolean;
  disabled?: boolean;
  type?: "button" | "submit";
  onClick?: (event: MouseEvent) => void;
  children: ComponentChildren;
}

export function Button({ variant = "secondary", compact, large, disabled, type = "button", onClick, children }: ButtonProps) {
  const handleClick = (event: MouseEvent) => {
    if (disabled) return event.preventDefault();
    onClick?.(event);
  };
  return (
    <button
      type={type}
      class={cx("btn", `btn--${variant}`, compact && "btn--compact", large && "btn--large")}
      aria-disabled={disabled ? "true" : undefined}
      onClick={handleClick}
    >
      {children}
    </button>
  );
}

export interface IconButtonProps extends Pick<ComponentProps<"button">, "onClick"> {
  icon: IconName;
  label: string;
  small?: boolean;
}

export function IconButton({ icon, label, small, onClick }: IconButtonProps) {
  return (
    <button type="button" class={cx("icon-btn", small && "icon-btn--sm")} aria-label={label} title={label} onClick={onClick}>
      <Icon name={icon} />
    </button>
  );
}

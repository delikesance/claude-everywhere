import type { ComponentChildren, ComponentProps } from "preact";
import { cx } from "./cx";
import { Icon } from "./Icon";

export type HelpTone = "error" | "ok";

export interface FieldProps {
  id: string;
  label: string;
  help?: string;
  helpTone?: HelpTone;
  children: (control: { id: string; "aria-describedby"?: string; "aria-invalid"?: "true" }) => ComponentChildren;
}

export function Field({ id, label, help, helpTone, children }: FieldProps) {
  const helpId = `${id}-help`;
  const control = {
    id,
    ...(help ? { "aria-describedby": helpId } : {}),
    ...(helpTone === "error" ? { "aria-invalid": "true" as const } : {}),
  };
  return (
    <div class="field">
      <label class="field__label" for={id}>
        {label}
      </label>
      {children(control)}
      {help && (
        <span id={helpId} class={cx("help", helpTone && `help--${helpTone}`)}>
          {helpTone && <Icon name={helpTone === "error" ? "circleAlert" : "check"} />}
          {help}
        </span>
      )}
    </div>
  );
}

export const Input = (props: ComponentProps<"input">) => <input {...props} class={cx("input", props.class as string)} />;
export const Textarea = (props: ComponentProps<"textarea">) => (
  <textarea {...props} class={cx("textarea", props.class as string)} />
);
export const Select = (props: ComponentProps<"select">) => <select {...props} class={cx("select", props.class as string)} />;

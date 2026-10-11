import type { ComponentChildren } from "preact";

export function UserMessage({ label, children }: { label: string; children: ComponentChildren }) {
  return (
    <article class="msg-user" aria-label={label}>
      <p class="overline">{label}</p>
      {children}
    </article>
  );
}

export interface AssistantMessageProps {
  label: string;
  number: number;
  children: ComponentChildren;
}

export function AssistantMessage({ label, number, children }: AssistantMessageProps) {
  return (
    <article class="msg-ai" aria-label={label}>
      <div class="msg-ai__margin">
        <span class="numeral" aria-hidden="true">
          {number}
        </span>
      </div>
      <div class="msg-ai__body">{children}</div>
    </article>
  );
}

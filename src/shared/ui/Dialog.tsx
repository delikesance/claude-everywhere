import type { ComponentChildren } from "preact";
import { useEffect } from "preact/hooks";

export interface DialogProps {
  titleId: string;
  title: string;
  onClose: () => void;
  children: ComponentChildren;
}

export function Dialog({ titleId, title, onClose, children }: DialogProps) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);
  return (
    <div class="scrim">
      <div class="dialog" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <h2 id={titleId}>{title}</h2>
        {children}
      </div>
    </div>
  );
}

import type { ComponentChildren } from "preact";
import { useEffect, useRef } from "preact/hooks";
import { useModalFocus } from "./dialog-focus";

export interface DialogProps {
  titleId: string;
  title: string;
  onClose: () => void;
  children: ComponentChildren;
}

export function Dialog({ titleId, title, onClose, children }: DialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  useModalFocus(dialogRef);
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);
  return (
    <div class="scrim">
      <div ref={dialogRef} class="dialog" role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}>
        <h2 id={titleId}>{title}</h2>
        {children}
      </div>
    </div>
  );
}

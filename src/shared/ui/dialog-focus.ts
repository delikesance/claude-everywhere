import type { RefObject } from "preact";
import { useEffect, useRef } from "preact/hooks";

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

const focusableIn = (root: HTMLElement): HTMLElement[] => [...root.querySelectorAll<HTMLElement>(FOCUSABLE)];

function siblingsAlongPath(node: HTMLElement): HTMLElement[] {
  const siblings: HTMLElement[] = [];
  for (let current: HTMLElement | null = node; current?.parentElement; current = current.parentElement) {
    siblings.push(...[...current.parentElement.children].filter((child): child is HTMLElement => child !== current && child instanceof HTMLElement));
  }
  return siblings;
}

function makeBackgroundInert(dialog: HTMLElement): () => void {
  const inerted = siblingsAlongPath(dialog).filter((element) => !element.hasAttribute("inert"));
  inerted.forEach((element) => element.setAttribute("inert", ""));
  return () => inerted.forEach((element) => element.removeAttribute("inert"));
}

export function trapTab(dialog: HTMLElement, event: KeyboardEvent): void {
  if (event.key !== "Tab") return;
  const focusable = focusableIn(dialog);
  const first = focusable[0];
  const last = focusable.at(-1);
  if (!first || !last) {
    event.preventDefault();
    return;
  }
  const inside = dialog.contains(document.activeElement);
  if (event.shiftKey && (!inside || document.activeElement === first || document.activeElement === dialog)) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && (!inside || document.activeElement === last)) {
    event.preventDefault();
    first.focus();
  }
}

export function useModalFocus(dialogRef: RefObject<HTMLElement | null>): void {
  // Read during the first render: child effects (e.g. an initial focus) run before this hook's effect.
  const opener = useRef(document.activeElement).current;
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const restoreBackground = makeBackgroundInert(dialog);
    if (!dialog.contains(document.activeElement)) (focusableIn(dialog)[0] ?? dialog).focus();
    const onKeyDown = (event: KeyboardEvent) => trapTab(dialog, event);
    dialog.addEventListener("keydown", onKeyDown);
    return () => {
      dialog.removeEventListener("keydown", onKeyDown);
      restoreBackground();
      if (opener instanceof HTMLElement) opener.focus();
    };
  }, [dialogRef]);
}

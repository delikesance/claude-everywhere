export const MIN_SELECTION_CHARS = 3;

const EDITABLE_SELECTOR = 'input, textarea, select, [contenteditable=""], [contenteditable="true"], [contenteditable="plaintext-only"]';

export interface PageSelection {
  text: string;
  rect: DOMRect;
}

function isEditable(node: Node | null): boolean {
  const element = node instanceof Element ? node : (node?.parentElement ?? null);
  return element?.closest(EDITABLE_SELECTOR) != null;
}

export function readSelection(): PageSelection | null {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return null;
  const text = selection.toString().trim();
  if (text.length < MIN_SELECTION_CHARS) return null;
  if (isEditable(document.activeElement) || isEditable(selection.anchorNode)) return null;
  return { text, rect: selection.getRangeAt(0).getBoundingClientRect() };
}

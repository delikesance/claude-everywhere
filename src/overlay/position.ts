const GAP = 8;
const EDGE = 8;
const MAX_CARD_HEIGHT_RATIO = 0.5;

// Set through CSSOM so the page's CSP cannot block it the way it can block inline style attributes.
function setOffsets(element: HTMLElement, offsets: Record<string, string>): void {
  for (const [property, value] of Object.entries(offsets)) element.style.setProperty(property, value);
}

export function placeNear(element: HTMLElement, anchor: DOMRect, width: number): void {
  const left = Math.max(EDGE, Math.min(anchor.left, window.innerWidth - width - EDGE));
  const fitsBelow = anchor.bottom + GAP + window.innerHeight * MAX_CARD_HEIGHT_RATIO <= window.innerHeight;
  setOffsets(
    element,
    fitsBelow
      ? { left: `${left}px`, top: `${anchor.bottom + GAP}px` }
      : { left: `${left}px`, bottom: `${window.innerHeight - anchor.top + GAP}px` },
  );
}

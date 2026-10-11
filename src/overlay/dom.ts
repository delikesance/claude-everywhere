import { ICON_SHAPES } from "../shared/ui/icon-shapes";
import type { IconName } from "../shared/ui/icon-shapes";

const SVG_NAMESPACE = "http://www.w3.org/2000/svg";
const ICON_VIEWBOX = "0 0 24 24";

export type Child = Node | string;

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string,
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  element.className = className;
  element.append(...children);
  return element;
}

export function icon(name: IconName): SVGSVGElement {
  const svg = document.createElementNS(SVG_NAMESPACE, "svg");
  svg.setAttribute("class", "icon");
  svg.setAttribute("viewBox", ICON_VIEWBOX);
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("focusable", "false");
  for (const [tag, attributes] of ICON_SHAPES[name]) {
    const shape = document.createElementNS(SVG_NAMESPACE, tag);
    for (const [key, value] of Object.entries(attributes)) shape.setAttribute(key, value);
    svg.append(shape);
  }
  return svg;
}

function keepSelection(button: HTMLButtonElement): void {
  button.addEventListener("mousedown", (event) => event.preventDefault());
}

export function textButton(label: string, iconName: IconName, onClick: () => void): HTMLButtonElement {
  const button = el("button", "btn btn--quiet btn--compact", icon(iconName), label);
  button.type = "button";
  button.addEventListener("click", onClick);
  keepSelection(button);
  return button;
}

export function closeButton(label: string, onClick: () => void): HTMLButtonElement {
  const button = el("button", "icon-btn icon-btn--sm", icon("x"));
  button.type = "button";
  button.setAttribute("aria-label", label);
  button.title = label;
  button.addEventListener("click", onClick);
  keepSelection(button);
  return button;
}

export function relabel(button: HTMLButtonElement, label: string): void {
  button.lastChild!.textContent = label;
}

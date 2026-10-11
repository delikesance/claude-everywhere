import { h } from "preact";
import { ICON_SHAPES } from "./icon-shapes";
import type { IconName } from "./icon-shapes";

export function Icon({ name }: { name: IconName }) {
  return (
    <svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      {ICON_SHAPES[name].map(([tag, attributes]) => h(tag, attributes))}
    </svg>
  );
}

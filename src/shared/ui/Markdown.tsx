import { useLayoutEffect, useRef } from "preact/hooks";
import { renderSafeMarkdown } from "../render-markdown";

export function Markdown({ source }: { source: string }) {
  const host = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => host.current?.replaceChildren(renderSafeMarkdown(source)), [source]);
  return <div class="md reading" ref={host} />;
}

import type { SearchHit } from "../../library";

type SnippetData = SearchHit["snippets"][number];

export function Snippet({ snippet }: { snippet: SnippetData }) {
  return (
    <p class="caption clamp-1">
      …{snippet.before}
      <mark class="hit">{snippet.hit}</mark>
      {snippet.after}…
    </p>
  );
}

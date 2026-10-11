import type { SearchHit } from "../../library";
import { Button } from "../../shared/ui";
import type { Artifact } from "../../shared/types";
import { formatDate, hostOf } from "../format";
import { Snippet } from "./Snippet";

interface ArtifactRowProps {
  artifact: Artifact;
  snippets?: SearchHit["snippets"] | undefined;
  onOpen: (id: string) => void;
}

export function ArtifactRow({ artifact, snippets, onOpen }: ArtifactRowProps) {
  const source = [hostOf(artifact.url), formatDate(artifact.updatedAt)].filter(Boolean).join(" · ");
  return (
    <li class="lib__row">
      <p class="row-title">
        <Button variant="quiet" onClick={() => onOpen(artifact.id)}>
          {artifact.title}
        </Button>
      </p>
      {snippets?.length ? (
        snippets.map((snippet, index) => <Snippet key={index} snippet={snippet} />)
      ) : (
        <p class="caption clamp-1">{artifact.excerpt}</p>
      )}
      <p class="lib__meta caption">
        {artifact.tags.map((tag) => (
          <span key={tag} class="tag">
            {tag}
          </span>
        ))}
        <span>{source}</span>
      </p>
    </li>
  );
}

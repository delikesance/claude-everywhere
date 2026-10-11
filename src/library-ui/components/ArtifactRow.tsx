import type { SearchHit } from "../../library";
import { formatChars } from "../../shared/format";
import { t } from "../../shared/i18n";
import { Icon } from "../../shared/ui";
import type { Artifact } from "../../shared/types";
import { formatDate, hostOf } from "../format";
import { detailHref } from "../route";
import { Snippet } from "./Snippet";

interface ArtifactRowProps {
  artifact: Artifact;
  snippets?: SearchHit["snippets"] | undefined;
  selected: boolean;
  onToggle: (id: string) => void;
}

export function ArtifactRow({ artifact, snippets, selected, onToggle }: ArtifactRowProps) {
  const meta = [hostOf(artifact.url), formatDate(artifact.updatedAt), formatChars(artifact.charCount)];
  return (
    <li class="lib__row">
      <label class="check">
        <input
          type="checkbox"
          checked={selected}
          aria-label={t("library_ui_select", { title: artifact.title })}
          onChange={() => onToggle(artifact.id)}
        />
        <span class="check__box">
          <Icon name="check" />
        </span>
      </label>
      <div class="grow">
        <p class="row-title">
          <a href={detailHref(artifact.id)}>{artifact.title}</a>
        </p>
        {snippets?.length ? (
          snippets.map((snippet, index) => <Snippet key={index} snippet={snippet} />)
        ) : (
          <p class="caption">
            {meta.filter(Boolean).join(" · ")}
            {artifact.tags.map((tag) => (
              <span key={tag}>
                {" "}
                <span class="tag">{tag}</span>
              </span>
            ))}
          </p>
        )}
      </div>
    </li>
  );
}

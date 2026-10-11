import { useState } from "preact/hooks";
import type { Library, ListQuery, SearchHit } from "../../library";
import { t } from "../../shared/i18n";
import { Input, Select } from "../../shared/ui";
import type { Artifact } from "../../shared/types";
import { attachToContext, exportAndDownload } from "../actions";
import { SEARCH_DEBOUNCE_MS, SEARCH_LIMIT } from "../constants";
import { useDebounced, useLibraryData, useSelection } from "../hooks";
import { StatusLine, useStatus } from "../status";
import { ArtifactRow } from "./ArtifactRow";
import { EmptyLibrary, ListSkeleton, LoadError, NoResult, NoTagged } from "./ListStates";
import { LibraryTools } from "./LibraryTools";
import { SelectionBar } from "./SelectionBar";
import { TagRail } from "./TagRail";

const SEARCH_WIDTH = "260px";

type Sort = NonNullable<ListQuery["sort"]>;
const SORTS: { value: Sort; labelKey: "library_ui_sortUpdated" | "library_ui_sortCreated" | "library_ui_sortTitle" }[] = [
  { value: "updated", labelKey: "library_ui_sortUpdated" },
  { value: "created", labelKey: "library_ui_sortCreated" },
  { value: "title", labelKey: "library_ui_sortTitle" },
];

function countTags(artifacts: Artifact[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const artifact of artifacts) for (const tag of artifact.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  return counts;
}

function ResultsCount({ count, query }: { count: number; query: string }) {
  return (
    <p class="caption" role="status">
      {count === 1 ? t("library_ui_resultsOne", { query }) : t("library_ui_resultsMany", { count, query })}
    </p>
  );
}

export function LibraryPage({ library }: { library: Library }) {
  const [sort, setSort] = useState<Sort>("updated");
  const [tag, setTag] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const query = useDebounced(input.trim(), SEARCH_DEBOUNCE_MS);
  const { selected, toggle, clear } = useSelection();
  const { status, run } = useStatus();

  const { data: artifacts, error } = useLibraryData(library, (lib) => lib.listArtifacts({ sort }), [sort]);
  const { data: hits } = useLibraryData(library, (lib) => (query ? lib.search(query, SEARCH_LIMIT) : Promise.resolve(null)), [query]);

  if (!artifacts) return error ? <LoadError /> : <ListSkeleton />;

  const matchesTag = (artifact: Artifact) => tag === null || artifact.tags.includes(tag);
  const searching = query !== "" && hits != null;
  const visibleHits: SearchHit[] = searching ? hits.filter((hit) => matchesTag(hit.artifact)) : [];
  const rows = searching
    ? visibleHits.map((hit) => ({ artifact: hit.artifact, snippets: hit.snippets }))
    : artifacts.filter(matchesTag).map((artifact) => ({ artifact, snippets: undefined }));
  const existingIds = new Set(artifacts.map((artifact) => artifact.id));
  const ids = [...selected].filter((id) => existingIds.has(id));

  return (
    <div class="lib">
      <TagRail tagCounts={countTags(artifacts)} total={artifacts.length} activeTag={tag} onSelect={setTag} />
      <div class="lib__main">
        <div class="row">
          <h1 class="grow">{t("library_ui_pageTitle")}</h1>
          <Select aria-label={t("library_ui_sortLabel")} value={sort} onChange={(event) => setSort(event.currentTarget.value as Sort)}>
            {SORTS.map((option) => (
              <option key={option.value} value={option.value}>
                {t(option.labelKey)}
              </option>
            ))}
          </Select>
          <div class="input-group" style={{ width: SEARCH_WIDTH }}>
            <Input
              type="search"
              aria-label={t("library_ui_search")}
              placeholder={t("library_ui_searchPlaceholder")}
              value={input}
              onInput={(event) => setInput(event.currentTarget.value)}
            />
          </div>
        </div>
        {ids.length > 0 && (
          <SelectionBar
            count={ids.length}
            onAttach={() => run(() => attachToContext(ids), "library_ui_attached")}
            onExport={() => run(() => exportAndDownload(library, ids, true), "library_ui_exported")}
            onClear={clear}
          />
        )}
        <StatusLine status={status} />
        {searching && <ResultsCount count={visibleHits.length} query={query} />}
        {rows.length > 0 && (
          <ul class="toc">
            {rows.map((row) => (
              <ArtifactRow key={row.artifact.id} {...row} selected={selected.has(row.artifact.id)} onToggle={toggle} />
            ))}
          </ul>
        )}
        {rows.length === 0 && searching && <NoResult query={query} onClear={() => setInput("")} />}
        {rows.length === 0 && !searching && artifacts.length === 0 && <EmptyLibrary />}
        {rows.length === 0 && !searching && artifacts.length > 0 && <NoTagged />}
        <LibraryTools library={library} />
      </div>
    </div>
  );
}

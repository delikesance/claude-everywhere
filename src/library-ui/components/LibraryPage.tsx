import { useState } from "preact/hooks";
import type { Library } from "../../library";
import { t } from "../../shared/i18n";
import { Icon, Input } from "../../shared/ui";
import { attachToContext, downloadFile } from "../actions";
import { SEARCH_DEBOUNCE_MS, SEARCH_LIMIT } from "../constants";
import { useDebounced, useLibraryData } from "../hooks";
import { StatusLine, useStatus } from "../status";
import { ArtifactRow } from "./ArtifactRow";
import { EmptyLibrary, ListSkeleton, LoadError, NoResult } from "./ListStates";
import { LibraryFooter } from "./LibraryFooter";

function EntryCount({ count }: { count: number }) {
  return (
    <p class="caption">
      {count === 1 ? t("library_ui_countOne") : t("library_ui_countMany", { count })} ·{" "}
      <span class="badge badge--local">
        <Icon name="lock" />
        {t("library_ui_localBadge")}
      </span>
    </p>
  );
}

function ResultsCount({ count, query }: { count: number; query: string }) {
  return (
    <p class="caption" role="status">
      {count === 1 ? t("library_ui_resultsOne", { query }) : t("library_ui_resultsMany", { count, query })}
    </p>
  );
}

export function LibraryPage({ library }: { library: Library }) {
  const [input, setInput] = useState("");
  const query = useDebounced(input.trim(), SEARCH_DEBOUNCE_MS);
  const { status, run } = useStatus();

  const { data: artifacts, error } = useLibraryData(library, (lib) => lib.listArtifacts(), []);
  const { data: hits } = useLibraryData(library, (lib) => (query ? lib.search(query, SEARCH_LIMIT) : Promise.resolve(null)), [query]);

  if (!artifacts) return error ? <LoadError /> : <ListSkeleton />;

  const searching = query !== "" && hits != null;
  const rows = searching
    ? hits.map(({ artifact, snippets }) => ({ artifact, snippets }))
    : artifacts.map((artifact) => ({ artifact, snippets: undefined }));

  return (
    <div class="lib">
      <div class="lib__main">
        <header class="row">
          <h1 class="grow">{t("library_ui_pageTitle")}</h1>
          <EntryCount count={artifacts.length} />
        </header>
        <div class="input-group">
          <Icon name="search" />
          <Input
            type="search"
            aria-label={t("library_ui_search")}
            placeholder={t("library_ui_searchPlaceholder")}
            value={input}
            onInput={(event) => setInput(event.currentTarget.value)}
          />
        </div>
        {searching && <ResultsCount count={rows.length} query={query} />}
        {rows.length > 0 && (
          <ul class="toc">
            {rows.map(({ artifact, snippets }) => (
              <ArtifactRow
                key={artifact.id}
                artifact={artifact}
                snippets={snippets}
                onOpen={(id) => run(() => attachToContext([id]), "library_ui_attached")}
              />
            ))}
          </ul>
        )}
        {rows.length === 0 && searching && <NoResult query={query} onClear={() => setInput("")} />}
        {artifacts.length === 0 && <EmptyLibrary />}
        <StatusLine status={status} />
      </div>
      {artifacts.length > 0 && (
        <LibraryFooter onExport={() => run(async () => downloadFile(await library.exportJson()), "library_ui_exported")} />
      )}
    </div>
  );
}

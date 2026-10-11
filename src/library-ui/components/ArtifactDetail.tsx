import { useState } from "preact/hooks";
import type { Library } from "../../library";
import { t } from "../../shared/i18n";
import type { Artifact, ArtifactVersion } from "../../shared/types";
import { Button, Icon, Markdown, Skeleton } from "../../shared/ui";
import { attachToContext, copyText, exportAndDownload } from "../actions";
import { formatDate, hostOf } from "../format";
import { useLibraryData } from "../hooks";
import { listHref } from "../route";
import { StatusLine, useStatus } from "../status";
import { ConfirmDialog } from "./ConfirmDialog";
import { DetailTitle } from "./DetailTitle";
import { LoadError } from "./ListStates";
import { TagEditor } from "./TagEditor";
import { VersionTabs } from "./VersionTabs";

interface DetailData {
  artifact: Artifact | null;
  versions: ArtifactVersion[];
}

async function loadDetail(library: Library, id: string): Promise<DetailData> {
  const [artifact, versions] = await Promise.all([library.getArtifact(id), library.listVersions(id)]);
  return { artifact, versions: [...versions].sort((a, b) => a.createdAt - b.createdAt) };
}

function BackRail() {
  return (
    <nav class="lib__rail" aria-label={t("library_ui_pageTitle")}>
      <a href={listHref}>{t("library_ui_back")}</a>
    </nav>
  );
}

function SavedOn({ artifact }: { artifact: Artifact }) {
  const host = hostOf(artifact.url);
  const date = formatDate(artifact.createdAt);
  return <p class="caption">{host ? t("library_ui_savedOn", { host, date }) : t("library_ui_savedOnNoHost", { date })}</p>;
}

export function ArtifactDetail({ library, id }: { library: Library; id: string }) {
  const { data, error, reload } = useLibraryData(library, (lib) => loadDetail(lib, id), [id]);
  const [pickedId, setPickedId] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const { status, run } = useStatus();

  if (!data) return error ? <LoadError /> : <Skeleton />;
  const { artifact, versions } = data;
  if (!artifact) {
    return (
      <div class="lib">
        <BackRail />
        <p class="lib__main caption" role="status">
          {t("library_ui_notFound")}
        </p>
      </div>
    );
  }

  const shown = versions.find((version) => version.id === (pickedId ?? artifact.currentVersionId)) ?? versions[versions.length - 1];
  const isCurrent = shown?.id === artifact.currentVersionId;
  const restore = (versionId: string) =>
    run(async () => {
      await library.restoreVersion(id, versionId);
      setPickedId(null);
      reload();
    }, "library_ui_restored");
  const update = (patch: Partial<Pick<Artifact, "title" | "tags">>) =>
    run(() => library.updateArtifact(id, patch).then(reload), "library_ui_updated");
  const remove = () =>
    run(async () => {
      try {
        await library.deleteArtifact(id);
        location.hash = listHref;
      } finally {
        setConfirmingDelete(false);
      }
    }, "library_ui_deleted");

  return (
    <div class="lib">
      <BackRail />
      <div class="lib__main">
        <DetailTitle title={artifact.title} onRename={(title) => update({ title })} />
        <SavedOn artifact={artifact} />
        <TagEditor tags={artifact.tags} onChange={(tags) => update({ tags })} />
        <VersionTabs versions={versions} currentVersionId={artifact.currentVersionId} selectedId={shown?.id ?? ""} onSelect={setPickedId} />
        <div role="tabpanel">
          <Markdown source={shown?.markdown ?? ""} />
        </div>
        {shown && !isCurrent && (
          <div class="row">
            <Button onClick={() => restore(shown.id)}>{t("library_ui_restore")}</Button>
          </div>
        )}
        <div class="row">
          <Button variant="primary" onClick={() => run(() => attachToContext([id]), "library_ui_attached")}>
            <Icon name="egress" />
            {t("library_ui_attach")}
          </Button>
          <Button onClick={() => run(() => exportAndDownload(library, [id], false), "library_ui_exported")}>
            {t("library_ui_exportMarkdown")}
          </Button>
          <Button onClick={() => run(() => copyText(shown?.markdown ?? ""), "library_ui_copied")}>{t("library_ui_copy")}</Button>
          <span class="grow" />
          <Button variant="danger" onClick={() => setConfirmingDelete(true)}>
            {t("library_ui_delete")}
          </Button>
        </div>
        <StatusLine status={status} />
      </div>
      {confirmingDelete && (
        <ConfirmDialog
          title={t("library_ui_deleteTitle")}
          body={t("library_ui_deleteBody", { title: artifact.title })}
          confirmLabel={t("library_ui_confirmDelete")}
          onConfirm={remove}
          onCancel={() => setConfirmingDelete(false)}
        />
      )}
    </div>
  );
}

import { useEffect, useState } from "preact/hooks";
import { openLibrary } from "../../library";
import { t } from "../../shared/i18n";
import type { Artifact } from "../../shared/types";
import { Button, Dialog, Notice } from "../../shared/ui";
import { addArtifact } from "../state/intake";

export function LibraryPicker({ onClose }: { onClose: () => void }) {
  const [artifacts, setArtifacts] = useState<Artifact[] | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    void openLibrary()
      .then((library) => library.listArtifacts())
      .then(setArtifacts, () => setFailed(true));
  }, []);

  const pick = async (id: string) => {
    try {
      await addArtifact(id);
      onClose();
    } catch {
      setFailed(true);
    }
  };

  return (
    <Dialog titleId="library-picker-title" title={t("sidebar_libraryTitle")} onClose={onClose}>
      {failed && <Notice tone="error" title={t("sidebar_libraryError")} />}
      {!failed && !artifacts && <p class="caption">{t("sidebar_libraryLoading")}</p>}
      {artifacts?.length === 0 && <p class="caption">{t("sidebar_libraryEmpty")}</p>}
      <ul>
        {artifacts?.map((artifact) => (
          <li key={artifact.id}>
            <button type="button" class="btn btn--quiet" onClick={() => void pick(artifact.id)}>
              {artifact.title}
            </button>
          </li>
        ))}
      </ul>
      <div class="row row--end">
        <Button variant="quiet" onClick={onClose}>
          {t("sidebar_close")}
        </Button>
      </div>
    </Dialog>
  );
}

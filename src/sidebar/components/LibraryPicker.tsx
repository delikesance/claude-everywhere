import { useEffect, useState } from "preact/hooks";
import { openLibrary } from "../../library";
import { t } from "../../shared/i18n";
import type { Artifact } from "../../shared/types";
import { Button, Dialog } from "../../shared/ui";
import { addArtifact } from "../state/intake";

export function LibraryPicker({ onClose }: { onClose: () => void }) {
  const [artifacts, setArtifacts] = useState<Artifact[] | null>(null);
  useEffect(() => {
    void openLibrary()
      .then((library) => library.listArtifacts())
      .then(setArtifacts);
  }, []);

  const pick = async (id: string) => {
    await addArtifact(id);
    onClose();
  };

  return (
    <Dialog titleId="library-picker-title" title={t("sidebar_libraryTitle")} onClose={onClose}>
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

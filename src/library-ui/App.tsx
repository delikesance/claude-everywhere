import { t } from "../shared/i18n";
import { Notice } from "../shared/ui";
import { ArtifactDetail } from "./components/ArtifactDetail";
import { LibraryPage } from "./components/LibraryPage";
import { ListSkeleton } from "./components/ListStates";
import { useOpenLibrary } from "./hooks";
import { useArtifactRoute } from "./route";

export function App() {
  const { library, error } = useOpenLibrary();
  const artifactId = useArtifactRoute();
  if (error) return <Notice tone="error" title={t("library_ui_openError")} />;
  if (!library) return <ListSkeleton />;
  return artifactId === null ? <LibraryPage library={library} /> : <ArtifactDetail key={artifactId} library={library} id={artifactId} />;
}

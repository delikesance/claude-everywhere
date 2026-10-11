import { t } from "../shared/i18n";
import { Notice } from "../shared/ui";
import { LibraryPage } from "./components/LibraryPage";
import { ListSkeleton } from "./components/ListStates";
import { useOpenLibrary } from "./hooks";

export function App() {
  const { library, error } = useOpenLibrary();
  if (error) return <Notice tone="error" title={t("library_ui_openError")} />;
  if (!library) return <ListSkeleton />;
  return <LibraryPage library={library} />;
}

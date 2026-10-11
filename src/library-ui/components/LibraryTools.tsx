import type { Library } from "../../library";
import { t } from "../../shared/i18n";
import { Button } from "../../shared/ui";
import { downloadFile } from "../actions";
import { StatusLine, useStatus } from "../status";
import { HelpBlock } from "./HelpBlock";
import { ImportControl } from "./ImportControl";

export function LibraryTools({ library }: { library: Library }) {
  const { status, run } = useStatus();
  const exportAll = () => run(async () => downloadFile(await library.exportJson()), "library_ui_exported");
  return (
    <div class="stack">
      <div class="row">
        <Button onClick={exportAll}>{t("library_ui_exportAll")}</Button>
      </div>
      <StatusLine status={status} />
      <ImportControl library={library} />
      <HelpBlock />
    </div>
  );
}

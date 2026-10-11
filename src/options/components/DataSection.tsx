import { downloadFile } from "../../library-ui/actions";
import { ImportControl } from "../../library-ui/components/ImportControl";
import { useOpenLibrary } from "../../library-ui/hooks";
import { StatusLine, useStatus } from "../../library-ui/status";
import { Button, Notice } from "../../shared/ui";
import { t } from "../../shared/i18n";
import { InlineConfirm } from "./InlineConfirm";

export function DataSection() {
  const { library, error } = useOpenLibrary();
  const { status, run } = useStatus();
  if (error) return <Notice tone="error" title={t("options_dataFailed")} />;
  if (!library) return <div role="status" />;

  return (
    <div class="stack">
      <p>{t("options_dataIntro")}</p>
      <div class="row">
        <Button onClick={() => run(async () => downloadFile(await library.exportJson()), "options_dataExported")}>
          {t("options_dataExport")}
        </Button>
        <InlineConfirm
          triggerLabel={t("options_dataEraseAll")}
          question={t("options_dataEraseConfirm")}
          confirmLabel={t("options_dataEraseYes")}
          onConfirm={() => run(() => library.clearAll(), "options_dataEraseDone")}
        />
      </div>
      <StatusLine status={status} />
      <ImportControl library={library} />
    </div>
  );
}

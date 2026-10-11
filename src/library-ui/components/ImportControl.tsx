import { useState } from "preact/hooks";
import type { ImportReport, Library } from "../../library";
import { t } from "../../shared/i18n";
import { Field, Input, Notice } from "../../shared/ui";

type Outcome = { report: ImportReport } | { failed: true } | null;

function ImportOutcome({ outcome }: { outcome: Outcome }) {
  if (!outcome) return <div role="status" />;
  if ("failed" in outcome) return <Notice tone="error" title={t("library_ui_importFailed")} />;
  return (
    <Notice tone="success" title={t("library_ui_importReportTitle")}>
      {t("library_ui_importReportBody", { ...outcome.report })}
    </Notice>
  );
}

export function ImportControl({ library }: { library: Library }) {
  const [outcome, setOutcome] = useState<Outcome>(null);
  const importFile = async (event: Event) => {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    try {
      setOutcome({ report: await library.importJson(await file.text()) });
    } catch {
      setOutcome({ failed: true });
    }
    input.value = "";
  };
  return (
    <div class="stack">
      <Field id="library-import" label={t("library_ui_importFile")}>
        {(control) => <Input {...control} type="file" accept="application/json,.json" onChange={importFile} />}
      </Field>
      <ImportOutcome outcome={outcome} />
    </div>
  );
}

import { useState } from "preact/hooks";
import { formatChars } from "../shared/format";
import { t } from "../shared/i18n";
import type { ArtifactDraft, ExtractedPage } from "../shared/types";
import { Button } from "../shared/ui/Button";
import { Field, Input } from "../shared/ui/Field";
import { toDraft } from "./view";

const EXCERPT_CHARS = 280;

export interface PreviewProps {
  page: ExtractedPage;
  onConfirm: (draft: ArtifactDraft) => void;
  onCancel: () => void;
}

export function Preview({ page, onConfirm, onCancel }: PreviewProps) {
  const [title, setTitle] = useState(page.title);
  const [tags, setTags] = useState("");
  return (
    <form
      class="stack"
      onSubmit={(event) => {
        event.preventDefault();
        onConfirm(toDraft(page, title, tags));
      }}
    >
      <p class="overline">{t("popup_previewTitle")}</p>
      <p class="caption">
        <span class="badge badge--local">{t("popup_local")}</span> {formatChars(page.charCount)} · {t("popup_localHint")}
      </p>
      <Field id="save-title" label={t("popup_fieldTitle")}>
        {(control) => <Input {...control} value={title} onInput={(event) => setTitle(event.currentTarget.value)} />}
      </Field>
      <Field id="save-tags" label={t("popup_fieldTags")}>
        {(control) => <Input {...control} value={tags} onInput={(event) => setTags(event.currentTarget.value)} />}
      </Field>
      <p class="overline">{t("popup_excerpt")}</p>
      <p class="reading reading--compact">{page.markdown.slice(0, EXCERPT_CHARS)}</p>
      <Button variant="primary" type="submit">
        {t("popup_confirm")}
      </Button>
      <Button variant="quiet" onClick={onCancel}>
        {t("popup_cancel")}
      </Button>
    </form>
  );
}

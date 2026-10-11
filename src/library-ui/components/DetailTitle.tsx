import { useState } from "preact/hooks";
import { t } from "../../shared/i18n";
import { Button } from "../../shared/ui";
import { InlineInput } from "./InlineInput";

interface DetailTitleProps {
  title: string;
  onRename: (title: string) => void;
}

export function DetailTitle({ title, onRename }: DetailTitleProps) {
  const [editing, setEditing] = useState(false);
  if (editing) {
    return (
      <InlineInput
        label={t("library_ui_titleLabel")}
        initial={title}
        onSubmit={(value) => {
          setEditing(false);
          onRename(value);
        }}
        onCancel={() => setEditing(false)}
      />
    );
  }
  return (
    <div class="row">
      <h1 class="grow">{title}</h1>
      <Button variant="quiet" compact onClick={() => setEditing(true)}>
        {t("library_ui_rename")}
      </Button>
    </div>
  );
}

import { useState } from "preact/hooks";
import { t } from "../../shared/i18n";
import { Button, Icon } from "../../shared/ui";
import { InlineInput } from "./InlineInput";

interface TagEditorProps {
  tags: string[];
  onChange: (tags: string[]) => void;
}

export function TagEditor({ tags, onChange }: TagEditorProps) {
  const [adding, setAdding] = useState(false);
  const addTag = (tag: string) => {
    setAdding(false);
    if (!tags.includes(tag)) onChange([...tags, tag]);
  };
  return (
    <div class="row">
      {tags.map((tag) => (
        <span class="tag" key={tag}>
          {tag}
          <button type="button" class="tag__x" aria-label={t("library_ui_removeTag", { tag })} onClick={() => onChange(tags.filter((other) => other !== tag))}>
            <Icon name="x" />
          </button>
        </span>
      ))}
      {adding ? (
        <InlineInput label={t("library_ui_newTag")} onSubmit={addTag} onCancel={() => setAdding(false)} />
      ) : (
        <Button variant="quiet" compact onClick={() => setAdding(true)}>
          {t("library_ui_addTag")}
        </Button>
      )}
    </div>
  );
}

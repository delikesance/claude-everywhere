import { useEffect, useRef, useState } from "preact/hooks";
import { t } from "../../shared/i18n";
import { Button, Input } from "../../shared/ui";

interface InlineInputProps {
  label: string;
  initial?: string;
  onSubmit: (value: string) => void;
  onCancel: () => void;
}

export function InlineInput({ label, initial = "", onSubmit, onCancel }: InlineInputProps) {
  const [value, setValue] = useState(initial);
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => form.current?.querySelector("input")?.focus(), []);

  const submit = (event: Event) => {
    event.preventDefault();
    const trimmed = value.trim();
    if (trimmed) onSubmit(trimmed);
  };
  const cancelOnEscape = (event: KeyboardEvent) => event.key === "Escape" && onCancel();

  return (
    <form ref={form} class="row" onSubmit={submit}>
      <Input
        aria-label={label}
        value={value}
        onInput={(event) => setValue(event.currentTarget.value)}
        onKeyDown={cancelOnEscape}
      />
      <Button type="submit" compact>
        {t("library_ui_save")}
      </Button>
      <Button variant="quiet" compact onClick={onCancel}>
        {t("library_ui_cancel")}
      </Button>
    </form>
  );
}

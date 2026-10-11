import type { MessageKey } from "../../shared/i18n";
import { t } from "../../shared/i18n";
import type { UiLocale } from "../../shared/types";
import { Field, Select } from "../../shared/ui";

type LocaleChoice = UiLocale | "auto";

const LOCALE_LABEL_KEYS: Record<UiLocale, MessageKey> = {
  fr: "options_localeFr",
  en: "options_localeEn",
};

interface LocaleSelectProps {
  id: string;
  label: string;
  autoLabel: string;
  value: LocaleChoice;
  onChange: (value: LocaleChoice) => void;
}

export function LocaleSelect({ id, label, autoLabel, value, onChange }: LocaleSelectProps) {
  return (
    <Field id={id} label={label}>
      {(control) => (
        <Select {...control} value={value} onChange={(event) => onChange(event.currentTarget.value as LocaleChoice)}>
          <option value="auto">{autoLabel}</option>
          {(Object.keys(LOCALE_LABEL_KEYS) as UiLocale[]).map((locale) => (
            <option key={locale} value={locale}>
              {t(LOCALE_LABEL_KEYS[locale])}
            </option>
          ))}
        </Select>
      )}
    </Field>
  );
}

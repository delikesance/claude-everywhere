import { MODEL_META } from "../../api/budget";
import { MODEL_IDS } from "../../shared/constants";
import { t } from "../../shared/i18n";
import { Field, Select } from "../../shared/ui";
import type { Settings } from "../../shared/types";

type Model = Settings["defaultModel"];

interface ModelSelectProps {
  value: Model;
  onChange: (model: Model) => void;
}

export function ModelSelect({ value, onChange }: ModelSelectProps) {
  return (
    <Field id="default-model" label={t("options_defaultModel")}>
      {(control) => (
        <Select {...control} value={value} onChange={(event) => onChange(event.currentTarget.value as Model)}>
          {MODEL_IDS.map((id) => (
            <option key={id} value={id}>
              {t(MODEL_META[id].labelKey)}
            </option>
          ))}
        </Select>
      )}
    </Field>
  );
}

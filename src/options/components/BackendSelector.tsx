import { t } from "../../shared/i18n";
import type { Settings } from "../../shared/types";
import { Seg } from "../../shared/ui";

export type Backend = Settings["backend"];

interface BackendSelectorProps {
  value: Backend;
  onChange: (backend: Backend) => void;
}

export function BackendSelector({ value, onChange }: BackendSelectorProps) {
  return (
    <Seg
      label={t("options_backendTitle")}
      value={value}
      options={[
        { value: "claude-code", label: t("options_backendClaudeCode") },
        { value: "api-key", label: t("options_backendApiKey") },
      ]}
      onChange={onChange}
    />
  );
}

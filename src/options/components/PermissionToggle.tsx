import { useState } from "preact/hooks";
import { t } from "../../shared/i18n";
import type { MessageKey } from "../../shared/i18n";
import { ensureHostPermission } from "../../shared/permissions";
import { Switch } from "../../shared/ui";

const ALL_URLS_ORIGIN = "<all_urls>";

interface PermissionToggleProps {
  label: string;
  checked: boolean;
  onChange: (enabled: boolean) => Promise<void>;
}

/** The setting only turns on once the permission is granted, so a refusal leaves the switch off. */
export function PermissionToggle({ label, checked, onChange }: PermissionToggleProps) {
  const [errorKey, setErrorKey] = useState<MessageKey | null>(null);
  const apply = async (enabled: boolean) => {
    try {
      const granted = !enabled || (await ensureHostPermission(ALL_URLS_ORIGIN));
      setErrorKey(granted ? null : "options_permissionRefused");
      if (granted) await onChange(enabled);
    } catch {
      setErrorKey("options_actionFailed");
    }
  };
  const toggle = (enabled: boolean) => void apply(enabled);
  return (
    <div class="stack">
      <div class="row">
        <Switch label={label} checked={checked} onChange={toggle} />
        <span aria-hidden="true">{label}</span>
      </div>
      <p class="help help--error" role="status">
        {errorKey && t(errorKey)}
      </p>
    </div>
  );
}

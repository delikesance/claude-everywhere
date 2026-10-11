import { useState } from "preact/hooks";
import { t } from "../../shared/i18n";
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
  const [refused, setRefused] = useState(false);
  const toggle = (enabled: boolean) => {
    if (!enabled) {
      setRefused(false);
      void onChange(false);
      return;
    }
    void ensureHostPermission(ALL_URLS_ORIGIN).then((granted) => {
      setRefused(!granted);
      if (granted) return onChange(true);
    });
  };
  return (
    <div class="stack">
      <div class="row">
        <Switch label={label} checked={checked} onChange={toggle} />
        <span aria-hidden="true">{label}</span>
      </div>
      <p class="help help--error" role="status">
        {refused && t("options_permissionRefused")}
      </p>
    </div>
  );
}

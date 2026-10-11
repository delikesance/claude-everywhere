import { useState } from "preact/hooks";
import { t } from "../shared/i18n";
import { ensureHostPermission } from "../shared/permissions";
import { Button } from "../shared/ui/Button";
import { Notice } from "../shared/ui/Notice";

export interface PermissionProps {
  origin: string;
  onGranted: () => void;
}

export function Permission({ origin, onGranted }: PermissionProps) {
  const [denied, setDenied] = useState(false);
  const grant = async () => {
    if (await ensureHostPermission(origin)) return onGranted();
    setDenied(true);
  };
  return (
    <Notice
      tone="warning"
      title={t("popup_permissionTitle")}
      actions={
        <Button variant="primary" compact onClick={grant}>
          {t("popup_permissionGrant")}
        </Button>
      }
    >
      {denied ? t("popup_permissionDenied") : t("popup_permissionBody", { origin })}
    </Notice>
  );
}

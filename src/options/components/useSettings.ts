import { useCallback, useEffect, useState } from "preact/hooks";
import { initI18n } from "../../shared/i18n";
import { getSettings, patchSettings } from "../../shared/settings";
import type { Settings } from "../../shared/types";

export function useSettings() {
  const [settings, setSettings] = useState<Settings | null>(null);
  useEffect(() => {
    void getSettings().then(setSettings);
  }, []);

  const update = useCallback(async (patch: Partial<Settings>) => {
    const next = await patchSettings(patch);
    if (patch.uiLocale !== undefined) await initI18n(next.uiLocale);
    setSettings(next);
  }, []);

  const refresh = useCallback(() => getSettings().then(setSettings), []);
  return { settings, update, refresh };
}

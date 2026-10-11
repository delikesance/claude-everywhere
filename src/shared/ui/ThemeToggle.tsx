import { t } from "../i18n";
import { applyTheme } from "../theme";
import type { Theme } from "../types";
import { Seg } from "./Seg";

export interface ThemeToggleProps {
  theme: Theme;
  onChange: (theme: Theme) => void;
}

export function ThemeToggle({ theme, onChange }: ThemeToggleProps) {
  const select = (next: Theme) => {
    applyTheme(next);
    onChange(next);
  };
  return (
    <Seg
      label={t("shared_themeLabel")}
      value={theme}
      onChange={select}
      options={[
        { value: "system", label: t("shared_themeSystem") },
        { value: "light", label: t("shared_themeLight") },
        { value: "dark", label: t("shared_themeDark") },
      ]}
    />
  );
}

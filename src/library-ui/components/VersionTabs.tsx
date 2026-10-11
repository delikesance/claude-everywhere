import { t } from "../../shared/i18n";
import type { ArtifactVersion } from "../../shared/types";
import { Tabs } from "../../shared/ui";

interface VersionTabsProps {
  versions: ArtifactVersion[];
  currentVersionId: string;
  selectedId: string;
  onSelect: (versionId: string) => void;
}

export function VersionTabs({ versions, currentVersionId, selectedId, onSelect }: VersionTabsProps) {
  const tabs = versions.map((version, index) => ({
    value: version.id,
    label: t(version.id === currentVersionId ? "library_ui_versionCurrent" : "library_ui_versionLabel", { n: index + 1 }),
  }));
  return <Tabs label={t("library_ui_versions")} value={selectedId} tabs={tabs.reverse()} onChange={onSelect} />;
}

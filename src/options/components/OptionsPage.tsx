import { MODEL_META } from "../../api/budget";
import { MODEL_IDS } from "../../shared/constants";
import { t } from "../../shared/i18n";
import type { MessageKey } from "../../shared/i18n";
import { Seg, Skeleton, ThemeToggle } from "../../shared/ui";
import { DataSection } from "./DataSection";
import { LocaleSelect } from "./LocaleSelect";
import { PermissionToggle } from "./PermissionToggle";
import { PrivacySection } from "./PrivacySection";
import { Section } from "./Section";
import { ShortcutsSection } from "./ShortcutsSection";
import { ApiKeyField } from "./ApiKeyField";
import { BackendSelector } from "./BackendSelector";
import { NativeHostCheck } from "./NativeHostCheck";
import { useSettings } from "./useSettings";

const SECTIONS: { id: string; folio: string; titleKey: MessageKey }[] = [
  { id: "key", folio: "I", titleKey: "options_backendSection" },
  { id: "model", folio: "II", titleKey: "options_defaultModel" },
  { id: "language", folio: "III", titleKey: "options_languageTitle" },
  { id: "sites", folio: "IV", titleKey: "options_sitesTitle" },
  { id: "shortcuts", folio: "V", titleKey: "options_shortcutsTitle" },
  { id: "data", folio: "VI", titleKey: "options_dataTitle" },
  { id: "privacy", folio: "VII", titleKey: "options_privacyTitle" },
];

function sectionProps(id: string) {
  const section = SECTIONS.find((candidate) => candidate.id === id)!;
  return { id, folio: section.folio, title: t(section.titleKey) };
}

export function OptionsPage() {
  const { settings, update, refresh } = useSettings();
  if (!settings) return <Skeleton lines={6} />;

  return (
    <div class="page page--rail">
      <nav class="page__nav" aria-label={t("options_navLabel")}>
        {SECTIONS.map((section) => (
          <a key={section.id} href={`#${section.id}`}>
            {t(section.titleKey)}
          </a>
        ))}
      </nav>
      <main class="stack">
        <h1 class="display">{t("options_pageTitle")}</h1>
        <Section {...sectionProps("key")}>
          <BackendSelector value={settings.backend} onChange={(backend) => void update({ backend })} />
          {settings.backend === "api-key" ? (
            <ApiKeyField
              storedKey={settings.apiKey}
              onOutcome={() => void refresh()}
              onClear={() => void update({ apiKey: null })}
            />
          ) : (
            <NativeHostCheck />
          )}
        </Section>
        <Section {...sectionProps("model")}>
          <Seg
            label={t("options_defaultModel")}
            value={settings.defaultModel}
            options={MODEL_IDS.map((id) => ({ value: id, label: t(MODEL_META[id].labelKey) }))}
            onChange={(defaultModel) => void update({ defaultModel })}
          />
        </Section>
        <Section {...sectionProps("language")}>
          <LocaleSelect
            id="answer-language"
            label={t("options_answerLanguage")}
            autoLabel={t("options_answerLanguageAuto")}
            value={settings.answerLanguage}
            onChange={(answerLanguage) => void update({ answerLanguage })}
          />
          <LocaleSelect
            id="ui-language"
            label={t("options_uiLanguage")}
            autoLabel={t("options_uiLanguageAuto")}
            value={settings.uiLocale}
            onChange={(uiLocale) => void update({ uiLocale })}
          />
          <ThemeToggle theme={settings.theme} onChange={(theme) => void update({ theme })} />
        </Section>
        <Section {...sectionProps("sites")}>
          <PermissionToggle
            label={t("options_overlayAllSites")}
            checked={settings.overlayAllSites}
            onChange={(overlayAllSites) => update({ overlayAllSites })}
          />
          <PermissionToggle
            label={t("options_sidebarReadsActiveTab")}
            checked={settings.sidebarReadsActiveTab}
            onChange={(sidebarReadsActiveTab) => update({ sidebarReadsActiveTab })}
          />
        </Section>
        <Section {...sectionProps("shortcuts")}>
          <ShortcutsSection />
        </Section>
        <Section {...sectionProps("data")}>
          <DataSection />
        </Section>
        <Section {...sectionProps("privacy")}>
          <PrivacySection />
        </Section>
      </main>
    </div>
  );
}

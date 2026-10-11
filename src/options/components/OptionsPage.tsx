import { t } from "../../shared/i18n";
import { Skeleton, ThemeToggle } from "../../shared/ui";
import { ApiKeyField } from "./ApiKeyField";
import { BackendSelector } from "./BackendSelector";
import { DataSection } from "./DataSection";
import { LocaleSelect } from "./LocaleSelect";
import { ModelSelect } from "./ModelSelect";
import { NativeHostCheck } from "./NativeHostCheck";
import { PermissionToggle } from "./PermissionToggle";
import { Section } from "./Section";
import { ShortcutsSection } from "./ShortcutsSection";
import { useSettings } from "./useSettings";

export function OptionsPage() {
  const { settings, update, refresh } = useSettings();
  if (!settings) return <Skeleton lines={6} />;

  return (
    <div class="page">
      <main class="stack">
        <h1 class="display">{t("options_pageTitle")}</h1>
        <Section id="key" folio="01" title={t("options_keySection")}>
          <BackendSelector value={settings.backend} onChange={(backend) => void update({ backend })} />
          {settings.backend === "api-key" && (
            <ApiKeyField
              storedKey={settings.apiKey}
              onOutcome={() => void refresh()}
              onClear={() => void update({ apiKey: null })}
            />
          )}
        </Section>
        <Section id="model" folio="02" title={t("options_defaultModel")}>
          <ModelSelect value={settings.defaultModel} onChange={(defaultModel) => void update({ defaultModel })} />
        </Section>
        <Section id="language" folio="03" title={t("options_languageTitle")}>
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
        <details class="advanced">
          <summary>{t("options_advancedTitle")}</summary>
          <Section id="sites" folio="04" title={t("options_sitesTitle")}>
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
          <Section id="shortcuts" folio="05" title={t("options_shortcutsTitle")}>
            <ShortcutsSection />
          </Section>
          <Section id="data" folio="06" title={t("options_dataTitle")}>
            <DataSection />
          </Section>
          <Section id="native" folio="07" title={t("options_nativeTitle")}>
            <NativeHostCheck />
          </Section>
          <p class="caption">{t("options_privacyStatement")}</p>
        </details>
      </main>
    </div>
  );
}

import { useEffect, useRef, useState } from "preact/hooks";
import { t } from "../../shared/i18n";
import { Button } from "../../shared/ui";
import { patchSettings } from "../../shared/settings";
import { ApiKeyField } from "./ApiKeyField";
import { isStored } from "./submitKey";
import type { KeyOutcome } from "./submitKey";

type Step = 1 | 2 | 3;

function ReadStep({ onContinue }: { onContinue: () => void }) {
  return (
    <>
      <h1 class="display" tabIndex={-1} data-step-heading>
        {t("options_onboardingReadTitle")}
      </h1>
      <p class="reading">{t("options_onboardingReadBody")}</p>
      <Button variant="primary" onClick={onContinue}>
        {t("options_onboardingContinue")}
      </Button>
    </>
  );
}

function KeyStep({ onStored }: { onStored: () => void }) {
  const finish = (outcome: KeyOutcome) => {
    if (!isStored(outcome)) return;
    void patchSettings({ onboardingDone: true }).then(onStored);
  };
  return (
    <>
      <h1 class="display" tabIndex={-1} data-step-heading>
        {t("options_onboardingKeyTitle")}
      </h1>
      <ApiKeyField storedKey={null} submitLabel={t("options_onboardingSubmit")} onOutcome={finish} />
    </>
  );
}

function ReadyStep({ onBack }: { onBack: () => void }) {
  return (
    <>
      <h1 class="display" tabIndex={-1} data-step-heading>
        {t("options_onboardingReadyTitle")}
      </h1>
      <p class="reading">{t("options_onboardingReadyBody")}</p>
      <div class="row">
        <Button onClick={onBack}>{t("options_onboardingBack")}</Button>
        <Button variant="primary" onClick={() => void browser.sidebarAction.open()}>
          {t("options_onboardingOpenPanel")}
        </Button>
      </div>
    </>
  );
}

export function OnboardingFlow() {
  const [step, setStep] = useState<Step>(1);
  const container = useRef<HTMLElement>(null);
  useEffect(() => {
    container.current?.querySelector<HTMLElement>("[data-step-heading]")?.focus();
  }, [step]);

  return (
    <main class="page stack" ref={container}>
      <p class="overline" role="status">
        {t("options_onboardingStep", { n: step })}
      </p>
      {step === 1 && <ReadStep onContinue={() => setStep(2)} />}
      {step === 2 && <KeyStep onStored={() => setStep(3)} />}
      {step === 3 && <ReadyStep onBack={() => setStep(2)} />}
    </main>
  );
}

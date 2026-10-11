import { useState } from "preact/hooks";
import { t } from "../../shared/i18n";
import { sendRequest } from "../../shared/messaging";
import { Button, Icon } from "../../shared/ui";

type PingState = "idle" | "busy" | "ok" | "failed";

export function NativeHostCheck() {
  const [state, setState] = useState<PingState>("idle");

  const test = () => {
    setState("busy");
    sendRequest("native/ping", {})
      .then(({ available }) => setState(available ? "ok" : "failed"))
      .catch(() => setState("failed"));
  };

  return (
    <div class="stack">
      <div class="row">
        <Button onClick={test} disabled={state === "busy"}>
          {state === "busy" ? t("options_nativeTesting") : t("options_nativeTest")}
        </Button>
      </div>
      <div role="status">
        {state === "ok" && (
          <p class="help help--ok">
            <Icon name="check" />
            {t("options_nativeOk")}
          </p>
        )}
        {state === "failed" && (
          <p class="help help--error">
            <Icon name="circleAlert" />
            {t("options_nativeFailed")}
          </p>
        )}
      </div>
      <p class="help">
        {t("options_nativeHint")} <code>npm run install:native-host</code>
      </p>
    </div>
  );
}

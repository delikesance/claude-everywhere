import type { ModelId } from "../shared/constants";
import { t } from "../shared/i18n";
import type { MessageKey } from "../shared/i18n";
import { connectChat } from "../shared/messaging";
import type { ApiError, ContextItem, UiLocale } from "../shared/types";

export interface ExplainRequest {
  items: ContextItem[];
  model: ModelId;
  userText: string;
  answerLanguage: "auto" | UiLocale;
}

export interface ExplainHandlers {
  onDelta(accumulated: string): void;
  onDone(): void;
  onError(error: ApiError): void;
}

const ERROR_KEYS: Partial<Record<ApiError["kind"], MessageKey>> = {
  no_key: "overlay_noKeyBody",
  auth: "overlay_errorAuth",
  rate_limit: "overlay_errorRate",
  overloaded: "overlay_errorOverloaded",
  network: "overlay_errorNetwork",
};

export function errorText(error: ApiError): string {
  if (error.kind === "bad_request") return t("overlay_errorRequest", { message: error.message });
  return t(ERROR_KEYS[error.kind] ?? "overlay_errorUnknown");
}

// Returns the abort function: it cancels the request and closes the Port.
export function startExplain(request: ExplainRequest, handlers: ExplainHandlers): () => void {
  const connection = connectChat();
  const requestId = crypto.randomUUID();
  let answer = "";
  let finished = false;

  const finish = () => {
    finished = true;
    connection.close();
  };

  connection.onMessage((message) => {
    if (finished || message.requestId !== requestId) return;
    if (message.type === "delta") {
      answer += message.text;
      handlers.onDelta(answer);
      return;
    }
    finish();
    if (message.type === "done") handlers.onDone();
    else handlers.onError(message.error);
  });

  connection.start({ requestId, history: [],...request });
  return () => {
    if (finished) return;
    connection.cancel(requestId);
    finish();
  };
}

import { extractPdf } from "../extraction";
import { openLibrary } from "../library";
import { pingNative, validateKey } from "../api";
import { AppException } from "../shared/errors";
import type { Request, RequestMap, Result } from "../shared/messages";
import { getSettings } from "../shared/settings";
import type { Settings } from "../shared/types";
import type { ArtifactDraft } from "../shared/types";
import { runCapture } from "./capture";
import { badRequest, toAppError } from "./errors";
import { takePendingCapture } from "./handoff";

type Sender = browser.runtime.MessageSender;
type Handlers = { [K in keyof RequestMap]: (req: Extract<Request, { type: K }>, sender: Sender) => Promise<RequestMap[K]["res"]> };

const OVERLAY_REQUEST_TYPES: ReadonlySet<string> = new Set(["overlay/config", "artifact/save", "capture/run"]);
const SOURCE_TYPES: ReadonlySet<unknown> = new Set(["page", "selection", "pdf", "note"]);
const CAPTURE_MODES: ReadonlySet<unknown> = new Set(["page", "selection"]);

const invalid = (what: string) => Promise.reject(new AppException(badRequest(`invalid ${what}`)));

function isDraft(value: unknown): value is ArtifactDraft {
  const d = value as Partial<Record<keyof ArtifactDraft, unknown>> | null;
  return (
    typeof d === "object" &&
    d !== null &&
    typeof d.title === "string" &&
    typeof d.markdown === "string" &&
    (d.url === null || typeof d.url === "string") &&
    SOURCE_TYPES.has(d.sourceType) &&
    Array.isArray(d.tags) &&
    d.tags.every((tag) => typeof tag === "string")
  );
}

function isContentScript(sender: Sender): boolean {
  return sender.tab !== undefined && !(sender.url ?? "").startsWith(browser.runtime.getURL(""));
}

const hasAnswerBackend = ({ backend, apiKey }: Settings): boolean => backend === "claude-code" || apiKey !== null;

const handlers: Handlers = {
  "key/validate": async ({ apiKey }) => {
    if (typeof apiKey !== "string" || apiKey === "") return invalid("key");
    await validateKey(apiKey);
    return { valid: true };
  },
  "native/ping": async () => ({ available: await pingNative() }),
  "capture/run": ({ mode, tabId, handoff }, sender) => {
    if (!CAPTURE_MODES.has(mode)) return invalid("mode");
    const overlay = isContentScript(sender);
    if (overlay && mode !== "selection") return invalid("mode");
    return runCapture({ mode, tabId: overlay ? sender.tab?.id : tabId, handoff: handoff === true });
  },
  "capture/takePending": () => takePendingCapture(),
  "pdf/extract": ({ url }) => (typeof url === "string" ? extractPdf(url) : invalid("url")),
  "artifact/save": async ({ draft }) => (isDraft(draft) ? (await openLibrary()).saveArtifact(draft) : invalid("draft")),
  "overlay/config": async () => {
    const settings = await getSettings();
    const { defaultModel, uiLocale, answerLanguage } = settings;
    return { defaultModel, uiLocale, answerLanguage, hasKey: hasAnswerBackend(settings) };
  },
};

function isRequest(message: unknown): message is Request {
  const type = (message as { type?: unknown } | null)?.type;
  return typeof type === "string" && Object.hasOwn(handlers, type);
}

function rejection(message: unknown, sender: Sender): Result<never> | null {
  if (sender.id !== browser.runtime.id) return { ok: false, error: badRequest("forbidden sender") };
  if (!isRequest(message)) return { ok: false, error: badRequest("unknown message") };
  if (isContentScript(sender) && !OVERLAY_REQUEST_TYPES.has(message.type)) {
    return { ok: false, error: badRequest("forbidden message") };
  }
  return null;
}

export async function routeMessage(message: unknown, sender: Sender): Promise<Result<unknown>> {
  const rejected = rejection(message, sender);
  if (rejected) return rejected;
  try {
    const handler = handlers[(message as Request).type] as (req: Request, sender: Sender) => Promise<unknown>;
    return { ok: true, value: await handler(message as Request, sender) };
  } catch (e) {
    return { ok: false, error: toAppError(e) };
  }
}

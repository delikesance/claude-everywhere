import Anthropic from "@anthropic-ai/sdk";
import { DEFAULT_MAX_TOKENS } from "../shared/constants";
import type { ChatServerMsg, ChatStart } from "../shared/messages";
import { getSettings } from "../shared/settings";
import { AppException } from "../shared/errors";
import type { ChatMessage, StopReason } from "../shared/types";
import { planContext, renderPrompt } from "./budget";
import { mapSdkError } from "./errors";
import { streamNative, transcriptPrompt } from "./native";

export { mapSdkError } from "./errors";
export { pingNative } from "./native";

const KEY_CHECK_MODEL = "claude-haiku-5-5";
const KEY_CHECK_MAX_TOKENS = 1;
const KEY_CHECK_PROMPT = "ping";
const KNOWN_STOP_REASONS: readonly StopReason[] = ["end_turn", "max_tokens", "refusal", "stop_sequence"];

function createClient(apiKey: string): Anthropic {
  return new Anthropic({ apiKey, baseURL: __API_BASE_URL__, dangerouslyAllowBrowser: true, maxRetries: 0 });
}

function toStopReason(reason: string | null): StopReason {
  return KNOWN_STOP_REASONS.find((known) => known === reason) ?? "other";
}

function historyMessages(history: ChatMessage[]): Anthropic.MessageParam[] {
  return history.filter((m) => m.text.length > 0).map((m) => ({ role: m.role, content: m.text }));
}

export async function validateKey(apiKey: string): Promise<void> {
  try {
    await createClient(apiKey).messages.create({
      model: KEY_CHECK_MODEL,
      max_tokens: KEY_CHECK_MAX_TOKENS,
      messages: [{ role: "user", content: KEY_CHECK_PROMPT }],
    });
  } catch (e) {
    throw new AppException(mapSdkError(e));
  }
}

function prepare(req: ChatStart) {
  const maxTokens = req.maxTokens ?? DEFAULT_MAX_TOKENS;
  const historyChars = req.history.reduce((total, m) => total + m.text.length, 0);
  const plan = planContext(req.items, req.userText, req.model, { maxTokens, historyChars });
  const { system, user } = renderPrompt(plan, req.userText, req.answerLanguage);
  return { maxTokens, plan, system, user };
}

async function runNativeChat(req: ChatStart, signal: AbortSignal, on: (m: ChatServerMsg) => void): Promise<ChatServerMsg> {
  const { maxTokens, plan, system, user } = prepare(req);
  return streamNative(
    {
      requestId: req.requestId,
      model: req.model,
      system,
      prompt: transcriptPrompt(req.history, user),
      maxTokens,
      bordereau: plan.bordereau,
    },
    signal,
    on,
  );
}

async function runChat(
  req: ChatStart,
  apiKey: string,
  signal: AbortSignal,
  on: (m: ChatServerMsg) => void,
): Promise<ChatServerMsg> {
  const { maxTokens, plan, system, user } = prepare(req);
  const stream = createClient(apiKey).messages.stream(
    {
      model: req.model,
      max_tokens: maxTokens,
      system,
      messages: [...historyMessages(req.history), { role: "user", content: user }],
    },
    { signal },
  );
  stream.on("text", (text) => on({ type: "delta", requestId: req.requestId, text }));
  const message = await stream.finalMessage();
  return {
    type: "done",
    requestId: req.requestId,
    stopReason: toStopReason(message.stop_reason),
    usage: { inputTokens: message.usage.input_tokens, outputTokens: message.usage.output_tokens },
    bordereau: plan.bordereau,
  };
}

export async function streamChat(
  req: ChatStart,
  signal: AbortSignal,
  on: (m: ChatServerMsg) => void,
): Promise<void> {
  const terminal = await settle(req, signal, on);
  on(terminal);
}

async function settle(req: ChatStart, signal: AbortSignal, on: (m: ChatServerMsg) => void): Promise<ChatServerMsg> {
  try {
    const { backend, apiKey } = await getSettings();
    if (backend === "claude-code") return await runNativeChat(req, signal, on);
    if (!apiKey) return { type: "error", requestId: req.requestId, error: { kind: "no_key" } };
    return await runChat(req, apiKey, signal, on);
  } catch (e) {
    return { type: "error", requestId: req.requestId, error: mapSdkError(e) };
  }
}

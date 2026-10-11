import { NATIVE_HOST_NAME } from "../shared/constants";
import type { ModelId } from "../shared/constants";
import type { ChatServerMsg } from "../shared/messages";
import type { ApiError, Bordereau, ChatMessage, StopReason } from "../shared/types";

type NativeErrorCode = "not_installed" | "not_logged_in" | "failed";

type HostMessage =
  | { type: "delta"; requestId: string; text: string }
  | { type: "done"; requestId: string; stopReason: StopReason; inputTokens: number; outputTokens: number }
  | { type: "error"; requestId: string; code: NativeErrorCode; message: string }
  | { type: "pong"; version: string };

export interface NativeTurn {
  requestId: string;
  model: ModelId;
  system: string;
  prompt: string;
  maxTokens: number;
  bordereau: Bordereau;
}

const NATIVE_ERRORS: Record<NativeErrorCode, ApiError> = {
  not_installed: { kind: "unknown", status: null },
  not_logged_in: { kind: "auth" },
  failed: { kind: "unknown", status: null },
};
const SPEAKER_LABELS: Record<ChatMessage["role"], string> = { user: "User", assistant: "Assistant" };

export function transcriptPrompt(history: ChatMessage[], userTurn: string): string {
  const past = history.filter((m) => m.text.length > 0).map((m) => `${SPEAKER_LABELS[m.role]}: ${m.text}`);
  return [...past, `${SPEAKER_LABELS.user}: ${userTurn}`].join("\n\n");
}

export function streamNative(
  turn: NativeTurn,
  signal: AbortSignal,
  on: (m: ChatServerMsg) => void,
): Promise<ChatServerMsg> {
  const port = browser.runtime.connectNative(NATIVE_HOST_NAME);
  const { requestId } = turn;
  return new Promise((resolve) => {
    const finish = (terminal: ChatServerMsg) => {
      signal.removeEventListener("abort", onAbort);
      port.disconnect();
      resolve(terminal);
    };
    const onAbort = () => {
      port.postMessage({ type: "cancel", requestId });
      finish({ type: "error", requestId, error: { kind: "aborted" } });
    };
    port.onMessage.addListener((raw) => {
      const msg = raw as HostMessage;
      if (msg.type === "delta") on({ type: "delta", requestId, text: msg.text });
      if (msg.type === "done") {
        finish({
          type: "done",
          requestId,
          stopReason: msg.stopReason,
          usage: { inputTokens: msg.inputTokens, outputTokens: msg.outputTokens },
          bordereau: turn.bordereau,
        });
      }
      if (msg.type === "error") finish({ type: "error", requestId, error: NATIVE_ERRORS[msg.code] });
    });
    port.onDisconnect.addListener(() => finish({ type: "error", requestId, error: { kind: "unknown", status: null } }));
    signal.addEventListener("abort", onAbort, { once: true });
    port.postMessage({
      type: "start",
      requestId,
      model: turn.model,
      system: turn.system,
      prompt: turn.prompt,
      maxTokens: turn.maxTokens,
    });
  });
}

export function pingNative(): Promise<boolean> {
  const port = browser.runtime.connectNative(NATIVE_HOST_NAME);
  return new Promise((resolve) => {
    port.onMessage.addListener((raw) => {
      if ((raw as HostMessage).type !== "pong") return;
      port.disconnect();
      resolve(true);
    });
    port.onDisconnect.addListener(() => resolve(false));
    port.postMessage({ type: "ping" });
  });
}

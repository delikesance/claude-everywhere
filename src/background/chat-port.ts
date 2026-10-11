import { streamChat } from "../api";
import type { ChatClientMsg, ChatServerMsg, ChatStart } from "../shared/messages";
import { parseChatStart } from "./chat-start";
import { badRequest } from "./errors";

interface ActiveStream {
  requestId: string;
  controller: AbortController;
}

function isChatClientMsg(value: unknown): value is ChatClientMsg {
  const m = value as { type?: unknown; requestId?: unknown } | null;
  return typeof m === "object" && m !== null && typeof m.requestId === "string" && (m.type === "start" || m.type === "cancel");
}

export function handleChatPort(port: browser.runtime.Port): void {
  if (port.sender?.id !== browser.runtime.id) {
    port.disconnect();
    return;
  }
  let connected = true;
  let active: ActiveStream | null = null;

  const post = (message: ChatServerMsg) => {
    if (connected) port.postMessage(message);
  };

  const start = (msg: ChatStart) => {
    if (active) {
      post({ type: "error", requestId: msg.requestId, error: badRequest("stream already running") });
      return;
    }
    const stream: ActiveStream = { requestId: msg.requestId, controller: new AbortController() };
    let terminated = false;
    active = stream;
    streamChat(msg, stream.controller.signal, (m) => {
      terminated ||= m.type !== "delta";
      post(m);
    })
      .catch(() => {
        if (!terminated) post({ type: "error", requestId: msg.requestId, error: { kind: "unknown", status: null } });
      })
      .finally(() => {
        active = null;
      });
  };

  const startValidated = (raw: ChatStart) => {
    const msg = parseChatStart(raw as unknown as Record<string, unknown>);
    if (msg) start(msg);
    else post({ type: "error", requestId: raw.requestId, error: badRequest("invalid chat request") });
  };

  port.onDisconnect.addListener(() => {
    connected = false;
    active?.controller.abort();
  });
  port.onMessage.addListener((raw) => {
    if (!isChatClientMsg(raw)) return;
    if (raw.type === "start") startValidated(raw);
    else if (active?.requestId === raw.requestId) active.controller.abort();
  });
}

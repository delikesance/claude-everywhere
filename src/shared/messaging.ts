import { CHAT_PORT_NAME } from "./constants";
import { AppException } from "./errors";
import type { ChatClientMsg, ChatConnection, ChatServerMsg, RequestMap, ResponseOf } from "./messages";

export async function sendRequest<K extends keyof RequestMap>(
  type: K,
  payload: RequestMap[K]["req"],
): Promise<RequestMap[K]["res"]> {
  const response = (await browser.runtime.sendMessage({ type, ...payload })) as ResponseOf<K>;
  if (!response.ok) throw new AppException(response.error);
  return response.value;
}

export function connectChat(): ChatConnection {
  const port = browser.runtime.connect({ name: CHAT_PORT_NAME });
  const post = (msg: ChatClientMsg) => port.postMessage(msg);
  return {
    start: (msg) => post({ type: "start", ...msg }),
    cancel: (requestId) => post({ type: "cancel", requestId }),
    onMessage: (cb) => port.onMessage.addListener((m) => cb(m as ChatServerMsg)),
    onDisconnect: (cb) => port.onDisconnect.addListener(cb),
    close: () => port.disconnect(),
  };
}

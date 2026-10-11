import type { ChatServerMsg, ChatStart } from "../shared/messages";
import type { ApiError } from "../shared/types";

export function validateKey(_apiKey: string): Promise<void> {
  throw new Error("not implemented");
}

export function streamChat(_req: ChatStart, _signal: AbortSignal, _on: (m: ChatServerMsg) => void): Promise<void> {
  throw new Error("not implemented");
}

export function mapSdkError(_e: unknown): ApiError {
  throw new Error("not implemented");
}

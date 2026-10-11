import type { ExtractionErrorData, ExtractionErrorKind } from "../shared/types";

export class ExtractionError extends Error {
  constructor(readonly data: ExtractionErrorData) {
    super(data.kind);
  }
}

export function errorData(kind: ExtractionErrorKind, message: string, origin?: string): ExtractionErrorData {
  return origin === undefined ? { kind, message } : { kind, message, origin };
}

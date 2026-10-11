import type { CaptureMode } from "../shared/messages";
import type { ExtractedPage, ExtractionErrorData } from "../shared/types";

export class ExtractionError extends Error {
  constructor(readonly data: ExtractionErrorData) {
    super(data.kind);
  }
}

export function extractTab(_tabId: number, _mode: CaptureMode): Promise<ExtractedPage> {
  throw new Error("not implemented");
}

export function extractPdf(_url: string): Promise<ExtractedPage> {
  throw new Error("not implemented");
}

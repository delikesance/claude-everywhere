import { ExtractionError } from "../extraction";
import { AppException } from "../shared/errors";
import type { ApiError, AppError } from "../shared/types";

export const badRequest = (message: string): ApiError => ({ kind: "bad_request", message });

export function toAppError(e: unknown): AppError {
  if (e instanceof AppException) return e.error;
  if (e instanceof ExtractionError) return e.data;
  return { kind: "unknown", status: null };
}

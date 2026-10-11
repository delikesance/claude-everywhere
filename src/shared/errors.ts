import type { AppError } from "./types";

export class AppException extends Error {
  constructor(readonly error: AppError) {
    super(error.kind);
  }
}

import { AppException } from "../../shared/errors";
import { sendRequest } from "../../shared/messaging";
import { API_ORIGIN, ensureHostPermission } from "../../shared/permissions";
import { patchSettings } from "../../shared/settings";

export type KeyOutcome = "valid" | "warning" | "empty" | "refused" | "auth" | "network" | "unknown";

const STORED_OUTCOMES: readonly KeyOutcome[] = ["valid", "warning"];

export const isStored = (outcome: KeyOutcome) => STORED_OUTCOMES.includes(outcome);

function failureOutcome(error: unknown): KeyOutcome {
  if (!(error instanceof AppException)) return "unknown";
  switch (error.error.kind) {
    case "auth":
      return "auth";
    case "network":
      return "network";
    case "rate_limit":
    case "overloaded":
      return "warning";
    default:
      return "unknown";
  }
}

async function validate(apiKey: string): Promise<KeyOutcome> {
  try {
    await sendRequest("key/validate", { apiKey });
    return "valid";
  } catch (error) {
    return failureOutcome(error);
  }
}

/** Must be called synchronously from a click: the permission prompt needs the user gesture. */
export async function submitKey(rawKey: string): Promise<KeyOutcome> {
  const apiKey = rawKey.trim();
  if (!apiKey) return "empty";
  if (!(await ensureHostPermission(API_ORIGIN))) return "refused";
  const outcome = await validate(apiKey);
  if (isStored(outcome)) await patchSettings({ apiKey });
  return outcome;
}

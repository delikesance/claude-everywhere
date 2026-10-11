const BADGE_OK_TEXT = "OK";
const BADGE_ERROR_TEXT = "!";
const BADGE_READ_TEXT = "Lu";
const BADGE_CLEAR_TEXT = "";
export const BADGE_DURATION_MS = 3000;

function setBadge(text: string, tabId: number | undefined): Promise<void> {
  return browser.action.setBadgeText(tabId === undefined ? { text } : { text, tabId });
}

async function flash(text: string, tabId: number | undefined): Promise<void> {
  await setBadge(text, tabId);
  setTimeout(() => void setBadge(BADGE_CLEAR_TEXT, tabId), BADGE_DURATION_MS);
}

export const flashSuccess = (tabId?: number) => flash(BADGE_OK_TEXT, tabId);
export const flashRead = (tabId?: number) => flash(BADGE_READ_TEXT, tabId);
export const flashError = (tabId?: number) => flash(BADGE_ERROR_TEXT, tabId);

export async function withErrorBadge(tabId: number | undefined, task: () => Promise<void>): Promise<void> {
  try {
    await task();
  } catch {
    await flashError(tabId);
  }
}

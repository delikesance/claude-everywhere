import type { ExportFile } from "../library";
import { STORAGE_KEYS } from "../shared/constants";

const REVOKE_DELAY_MS = 1000;

export function downloadFile(file: ExportFile): void {
  const url = URL.createObjectURL(
    new Blob([file.content], { type: file.mime }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = file.filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), REVOKE_DELAY_MS);
}

/** The sidebar must be opened synchronously: it only opens inside the user gesture. */
export function attachToContext(ids: string[]): Promise<void> {
  const saved = browser.storage.session.set({
    [STORAGE_KEYS.pendingAttach]: ids,
  });
  const opened = browser.sidebarAction.open();
  return Promise.all([saved, opened]).then(() => undefined);
}

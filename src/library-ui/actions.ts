import type { ExportFile, Library } from "../library";
import { PENDING_ATTACH_KEY } from "./constants";

export function downloadFile(file: ExportFile): void {
  const url = URL.createObjectURL(new Blob([file.content], { type: file.mime }));
  const link = document.createElement("a");
  link.href = url;
  link.download = file.filename;
  link.click();
  URL.revokeObjectURL(url);
}

/** The sidebar must be opened synchronously: it only opens inside the user gesture. */
export function attachToContext(ids: string[]): Promise<void> {
  const saved = browser.storage.session.set({ [PENDING_ATTACH_KEY]: ids });
  void browser.sidebarAction.open();
  return saved;
}

export async function exportAndDownload(library: Library, ids: string[], bundle: boolean): Promise<void> {
  downloadFile(await library.exportMarkdown(ids, bundle));
}

export function copyText(text: string): Promise<void> {
  return navigator.clipboard.writeText(text);
}

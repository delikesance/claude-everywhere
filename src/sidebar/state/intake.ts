import { artifactToContextItem, openLibrary } from "../../library";
import { STORAGE_KEYS } from "../../shared/constants";
import { t } from "../../shared/i18n";
import type { CaptureMode } from "../../shared/messages";
import { sendRequest } from "../../shared/messaging";
import { hasHostPermission } from "../../shared/permissions";
import { AppException } from "../../shared/types";
import type { ContextItem, ContextKind, ExtractedPage } from "../../shared/types";
import { addItem, attachItem, conversation, replaceItem, resetConversation } from "./conversation";
import { settings } from "./session";

export const PENDING_ATTACH_KEY = "pendingAttach";
const ALL_URLS = "<all_urls>";

const KIND_BY_SOURCE: Record<ExtractedPage["sourceType"], ContextKind> = {
  page: "page",
  selection: "selection",
  pdf: "pdf",
  manual: "note",
};

export const pageToItem = (page: ExtractedPage): ContextItem => ({
  id: crypto.randomUUID(),
  kind: KIND_BY_SOURCE[page.sourceType],
  title: page.title,
  url: page.url,
  text: page.markdown,
  included: true,
  status: "ready",
});

const loadingItem = (kind: ContextKind): ContextItem => ({
  id: crypto.randomUUID(),
  kind,
  title: "",
  url: null,
  text: "",
  included: true,
  status: "loading",
});

const unreadableItem = (id: string, kind: ContextKind): ContextItem => ({
  ...loadingItem(kind),
  id,
  title: t("sidebar_pageUnreadable"),
  included: false,
  status: "unreadable",
});

async function ignoreAppErrors<T>(run: () => Promise<T>): Promise<T | null> {
  try {
    return await run();
  } catch (error) {
    if (error instanceof AppException) return null;
    throw error;
  }
}

export async function capture(mode: CaptureMode): Promise<void> {
  const placeholder = loadingItem(mode);
  addItem(placeholder);
  const page = await ignoreAppErrors(() => sendRequest("capture/run", { mode, handoff: false }));
  replaceItem(placeholder.id, page ? { ...pageToItem(page), id: placeholder.id } : unreadableItem(placeholder.id, mode));
}

export async function intakePending(): Promise<void> {
  const page = await ignoreAppErrors(() => sendRequest("capture/takePending", {}));
  if (page) addItem(pageToItem(page));
}

async function loadArtifactItem(id: string): Promise<ContextItem | null> {
  const artifact = await (await openLibrary()).getArtifact(id);
  return artifact ? artifactToContextItem(artifact) : null;
}

export async function addArtifact(id: string): Promise<void> {
  const item = await loadArtifactItem(id);
  if (item && !conversation.value.items.some((existing) => existing.id === item.id)) addItem(item);
}

export async function attachArtifact(id: string): Promise<void> {
  await browser.storage.session.remove(PENDING_ATTACH_KEY);
  const item = await loadArtifactItem(id);
  if (!item) return;
  if (conversation.value.messages.length > 0) resetConversation();
  attachItem(item);
}

async function readPendingAttach(): Promise<void> {
  const stored = await browser.storage.session.get(PENDING_ATTACH_KEY);
  const id: unknown = stored[PENDING_ATTACH_KEY];
  if (typeof id === "string") await attachArtifact(id);
}

async function shouldAutoCapture(): Promise<boolean> {
  return settings.value.sidebarReadsActiveTab && (await hasHostPermission(ALL_URLS));
}

export async function intakeOnOpen(): Promise<void> {
  await intakePending();
  const hasPendingItem = conversation.value.items.length > 0;
  if (!hasPendingItem && (await shouldAutoCapture())) await capture("page");
  await readPendingAttach();
}

export function watchIntake(): void {
  browser.storage.onChanged.addListener((changes, area) => {
    if (area !== "session") return;
    const attach = changes[PENDING_ATTACH_KEY]?.newValue as unknown;
    if (typeof attach === "string") void attachArtifact(attach);
    if (changes[STORAGE_KEYS.pendingCapture]?.newValue !== undefined) void intakePending();
  });
}

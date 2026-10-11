import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppException } from "../../shared/types";
import type { ContextItem, ExtractedPage } from "../../shared/types";

const send = vi.hoisted(() => vi.fn());
const library = vi.hoisted(() => ({ getArtifact: vi.fn() }));
const session = vi.hoisted(() => ({ store: new Map<string, unknown>() }));

vi.mock("../../shared/messaging", () => ({ sendRequest: send }));
vi.mock("../../library", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../library")>()),
  openLibrary: async () => library,
}));

type ChangeListener = (changes: Record<string, { newValue?: unknown }>, area: string) => void;
const listeners = vi.hoisted(() => ({ current: [] as unknown[] }));
const emitChange = (changes: Record<string, { newValue?: unknown }>, area = "session") =>
  listeners.current.forEach((listener) => (listener as ChangeListener)(changes, area));

const { conversation, resetConversation, addItem } = await import("./conversation");
const intake = await import("./intake");

const page: ExtractedPage = {
  url: "https://x.test",
  title: "Titre",
  siteName: null,
  lang: "fr",
  sourceType: "page",
  markdown: "contenu",
  charCount: 7,
  capturedAt: 0,
  usedFallback: false,
};

const artifact = { id: "a1", title: "Note", url: null, markdown: "md" };

beforeEach(() => {
  vi.clearAllMocks();
  session.store.clear();
  listeners.current = [];
  Object.assign(globalThis, {
    browser: {
      storage: {
        onChanged: { addListener: (listener: unknown) => listeners.current.push(listener) },
        session: {
          get: async (key: string) => (session.store.has(key) ? { [key]: session.store.get(key) } : {}),
          remove: async (key: string) => void session.store.delete(key),
        },
      },
    },
  });
  resetConversation();
});

describe("intake", () => {
  it("adds a pending capture as an included ready chip", async () => {
    send.mockResolvedValueOnce(page);
    await intake.intakePending();
    expect(send).toHaveBeenCalledWith("capture/takePending", {});
    expect(conversation.value.items[0]).toMatchObject({ kind: "page", title: "Titre", included: true, status: "ready" });
  });

  it("adds nothing when no capture is pending", async () => {
    send.mockResolvedValueOnce(null);
    await intake.intakePending();
    expect(conversation.value.items).toEqual([]);
  });

  it("capture shows a loading chip then the ready item", async () => {
    let resolve!: (p: ExtractedPage) => void;
    send.mockReturnValueOnce(new Promise<ExtractedPage>((r) => (resolve = r)));
    const running = intake.capture("selection");
    expect(conversation.value.items[0]?.status).toBe("loading");
    resolve({ ...page, sourceType: "selection" });
    await running;
    expect(conversation.value.items).toHaveLength(1);
    expect(conversation.value.items[0]).toMatchObject({ kind: "selection", status: "ready" });
  });

  it("capture failure leaves an excluded unreadable chip", async () => {
    send.mockRejectedValueOnce(new AppException({ kind: "restricted", message: "no" }));
    await intake.capture("page");
    expect(conversation.value.items[0]).toMatchObject({ status: "unreadable", included: false });
  });

  it("loads a pending attach as a chip and excludes existing items", async () => {
    addItem({ id: "old", kind: "page", title: "o", url: null, text: "t", included: true, status: "ready" });
    session.store.set(intake.PENDING_ATTACH_KEY, "a1");
    library.getArtifact.mockResolvedValueOnce(artifact);
    send.mockResolvedValueOnce(null);
    await intake.intakeOnOpen();
    const [old, attached] = conversation.value.items;
    expect(old?.included).toBe(false);
    expect(attached).toMatchObject({ id: "artifact-a1", included: true });
    expect(session.store.has(intake.PENDING_ATTACH_KEY)).toBe(false);
  });

  it("takes a capture stored after the sidebar opened", async () => {
    intake.watchIntake();
    send.mockResolvedValueOnce(page);
    emitChange({ pendingCapture: { newValue: page } });
    await vi.waitFor(() => expect(conversation.value.items).toHaveLength(1));
    expect(send).toHaveBeenCalledWith("capture/takePending", {});
  });

  it("ignores the removal of the pending capture and other storage areas", () => {
    intake.watchIntake();
    emitChange({ pendingCapture: { newValue: undefined } });
    emitChange({ pendingCapture: { newValue: page } }, "local");
    expect(send).not.toHaveBeenCalled();
  });

  it("attaches an artifact whose id is stored after the sidebar opened", async () => {
    intake.watchIntake();
    library.getArtifact.mockResolvedValueOnce(artifact);
    emitChange({ [intake.PENDING_ATTACH_KEY]: { newValue: "a1" } });
    await vi.waitFor(() => expect(conversation.value.items[0]).toMatchObject({ artifactId: "a1" }));
  });

  it("adds a library artifact once", async () => {
    library.getArtifact.mockResolvedValue(artifact);
    await intake.addArtifact("a1");
    await intake.addArtifact("a1");
    expect(conversation.value.items).toHaveLength(1);
  });
});

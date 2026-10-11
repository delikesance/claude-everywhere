import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppException } from "../../shared/types";
import type { ContextItem, ExtractedPage } from "../../shared/types";

const send = vi.hoisted(() => vi.fn());
const library = vi.hoisted(() => ({ getArtifact: vi.fn() }));
const session = vi.hoisted(() => ({ store: new Map<string, unknown>() }));

vi.mock("../../shared/messaging", () => ({ sendRequest: send }));
vi.mock("../../library", () => ({
  openLibrary: async () => library,
  artifactToContextItem: (a: { id: string; markdown: string }): ContextItem => ({
    id: `art-${a.id}`,
    kind: "artifact",
    title: "A",
    url: null,
    text: a.markdown,
    included: true,
    status: "ready",
    artifactId: a.id,
  }),
}));

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

beforeEach(() => {
  vi.clearAllMocks();
  session.store.clear();
  Object.assign(globalThis, {
    browser: {
      storage: {
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
    library.getArtifact.mockResolvedValueOnce({ id: "a1", markdown: "md" });
    send.mockResolvedValueOnce(null);
    await intake.intakeOnOpen();
    const [old, attached] = conversation.value.items;
    expect(old?.included).toBe(false);
    expect(attached).toMatchObject({ id: "art-a1", included: true });
    expect(session.store.has(intake.PENDING_ATTACH_KEY)).toBe(false);
  });
});

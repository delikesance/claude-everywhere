import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Library } from "./contract";
import { openLibrary } from "./index";
import { conversation, draft, freshLibrary } from "./test-utils";

describe("library", () => {
  let library: Library;
  beforeEach(async () => {
    library = await freshLibrary();
  });

  it("opens one instance per realm", async () => {
    expect(openLibrary()).toBe(openLibrary());
    const opened = await openLibrary();
    await opened.clearAll();
  });

  it("stores conversations and lists them without their content", async () => {
    const older = conversation({ updatedAt: 1, title: "old" });
    const newer = conversation({ updatedAt: 2, title: "new" });
    await library.saveConversation(older);
    await library.saveConversation(newer);
    expect(await library.getConversation(older.id)).toEqual(older);
    const listed = await library.listConversations();
    expect(listed.map((c) => c.title)).toEqual(["new", "old"]);
    expect(listed[0]).not.toHaveProperty("messages");
    expect(listed[0]).not.toHaveProperty("items");
    await library.deleteConversation(older.id);
    expect(await library.getConversation(older.id)).toBeNull();
  });

  it("clears every store", async () => {
    const saved = await library.saveArtifact(draft());
    await library.saveConversation(conversation());
    await library.search("corps");
    await library.clearAll();
    expect(await library.listArtifacts()).toEqual([]);
    expect(await library.listVersions(saved.id)).toEqual([]);
    expect(await library.listConversations()).toEqual([]);
    expect(await library.search("corps")).toEqual([]);
  });

  it("notifies subscribers of changes until unsubscribed", async () => {
    const callback = vi.fn();
    const unsubscribe = library.onChange(callback);
    await library.saveArtifact(draft());
    await vi.waitFor(() => expect(callback).toHaveBeenCalledTimes(1));
    unsubscribe();
    await library.saveConversation(conversation());
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(callback).toHaveBeenCalledTimes(1);
  });
});

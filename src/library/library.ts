import { LIBRARY_CHANNEL } from "../shared/constants";
import * as store from "./artifacts";
import type { Library } from "./contract";
import type { LibraryDb } from "./db";
import { buildJsonExport, buildMarkdownExport } from "./export";
import { parseImport } from "./import";
import { mergeImport } from "./merge";
import { createSearchIndex } from "./search";

function createChangeFeed(onChange: () => void) {
  const sender = new BroadcastChannel(LIBRARY_CHANNEL);
  const receiver = new BroadcastChannel(LIBRARY_CHANNEL);
  receiver.addEventListener("message", onChange);
  return {
    notify(): void {
      onChange();
      sender.postMessage(null);
    },
    subscribe(callback: () => void): () => void {
      receiver.addEventListener("message", callback);
      return () => receiver.removeEventListener("message", callback);
    },
  };
}

export function createLibrary(db: LibraryDb): Library {
  const searchIndex = createSearchIndex(() => store.loadCurrentContents(db));
  const changes = createChangeFeed(() => searchIndex.invalidate());
  const mutating = async <T>(write: Promise<T>): Promise<T> => {
    const result = await write;
    changes.notify();
    return result;
  };

  return {
    saveArtifact: (draft) => mutating(store.saveArtifact(db, draft)),
    getArtifact: (id) => store.getArtifact(db, id),
    listArtifacts: (q) => store.listArtifacts(db, q),
    updateArtifact: (id, patch) => mutating(store.updateArtifact(db, id, patch)),
    addVersion: (id, markdown) => mutating(store.addVersion(db, id, markdown)),
    listVersions: (id) => store.listVersions(db, id),
    restoreVersion: (id, versionId) => mutating(store.restoreVersion(db, id, versionId)),
    deleteArtifact: (id) => mutating(store.deleteArtifact(db, id)),
    search: (query, limit) => searchIndex.search(query, limit),
    saveConversation: (c) => mutating(db.put("conversations", c).then(() => undefined)),
    getConversation: async (id) => (await db.get("conversations", id)) ?? null,
    listConversations: async () => {
      const all = await db.getAll("conversations");
      return all
        .map(({ messages: _messages, items: _items, ...summary }) => summary)
        .sort((a, b) => b.updatedAt - a.updatedAt);
    },
    deleteConversation: (id) => mutating(db.delete("conversations", id)),
    exportMarkdown: async (ids, bundle) => {
      const found = await Promise.all(ids.map((id) => store.getArtifact(db, id)));
      return buildMarkdownExport(found.filter((a) => a !== null), bundle);
    },
    exportJson: async () => {
      const [artifacts, versions, conversations] = await Promise.all([
        db.getAll("artifacts"),
        db.getAll("versions"),
        db.getAll("conversations"),
      ]);
      return buildJsonExport({ artifacts, versions, conversations }, new Date());
    },
    importJson: async (text) => mutating(mergeImport(db, parseImport(text))),
    clearAll: () =>
      mutating(
        Promise.all([db.clear("artifacts"), db.clear("versions"), db.clear("conversations")]).then(() => undefined),
      ),
    onChange: changes.subscribe,
  };
}

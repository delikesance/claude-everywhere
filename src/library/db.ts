import { openDB, type DBSchema, type IDBPDatabase, type IDBPTransaction } from "idb";
import { DB_NAME, DB_VERSION } from "../shared/constants";
import type { Artifact, ArtifactVersion, Conversation } from "../shared/types";

interface LibrarySchema extends DBSchema {
  artifacts: { key: string; value: Artifact; indexes: { "by-url": string } };
  versions: { key: string; value: ArtifactVersion; indexes: { "by-artifact": string } };
  conversations: { key: string; value: Conversation };
}

export type LibraryDb = IDBPDatabase<LibrarySchema>;

export const VERSION_STORES: ["artifacts", "versions"] = ["artifacts", "versions"];
export type VersionTx = IDBPTransaction<LibrarySchema, ["artifacts", "versions"], "readwrite">;

export function openLibraryDb(name: string = DB_NAME): Promise<LibraryDb> {
  return openDB<LibrarySchema>(name, DB_VERSION, {
    upgrade(db, oldVersion) {
      if (oldVersion < 1) {
        db.createObjectStore("artifacts", { keyPath: "id" }).createIndex("by-url", "url");
        db.createObjectStore("versions", { keyPath: "id" }).createIndex("by-artifact", "artifactId");
        db.createObjectStore("conversations", { keyPath: "id" });
      }
    },
  });
}

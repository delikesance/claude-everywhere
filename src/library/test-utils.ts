import "fake-indexeddb/auto";
import type { ArtifactDraft, Conversation } from "../shared/types";
import type { Library } from "./contract";
import { openLibraryDb } from "./db";
import { createLibrary } from "./library";

export async function freshLibrary(): Promise<Library> {
  return createLibrary(await openLibraryDb(crypto.randomUUID()));
}

export function draft(overrides: Partial<ArtifactDraft> = {}): ArtifactDraft {
  return {
    title: "Titre",
    url: "https://example.com/a",
    sourceType: "page",
    tags: [],
    markdown: "Corps du texte",
    ...overrides,
  };
}

export function conversation(overrides: Partial<Conversation> = {}): Conversation {
  return {
    id: crypto.randomUUID(),
    title: "Discussion",
    createdAt: 1,
    updatedAt: 1,
    model: "claude-sonnet-5-5",
    items: [],
    messages: [{ id: "m1", role: "user", text: "Bonjour", createdAt: 1 }],
    ...overrides,
  };
}

import type { Artifact, ArtifactWithContent } from "../shared/types";
import type { SearchHit, SearchSnippet } from "./contract";

const FIELD_WEIGHT = { title: 100, tag: 10, text: 1 } as const;
const DEFAULT_SEARCH_LIMIT = 50;
const SNIPPET_CONTEXT_CHARS = 40;
const MAX_SNIPPETS_PER_HIT = 3;
const COMBINING_MARKS = /\p{M}/gu;
const WORD = /[\p{L}\p{N}\p{M}]+/gu;
const WHITESPACE = /\s+/g;

type Field = keyof typeof FIELD_WEIGHT;
interface Token {
  folded: string;
  start: number;
  end: number;
}
interface IndexedField {
  field: Field;
  text: string;
  tokens: Token[];
}
interface IndexEntry {
  artifact: Artifact;
  fields: IndexedField[];
}
interface FieldMatch {
  indexed: IndexedField;
  token: Token;
}

export function foldText(text: string): string {
  return text.normalize("NFD").replace(COMBINING_MARKS, "").toLowerCase();
}

function tokenize(text: string): Token[] {
  return Array.from(text.matchAll(WORD), (match) => ({
    folded: foldText(match[0]),
    start: match.index,
    end: match.index + match[0].length,
  }));
}

function indexField(field: Field, text: string): IndexedField {
  return { field, text, tokens: tokenize(text) };
}

function buildEntry({ markdown, ...artifact }: ArtifactWithContent): IndexEntry {
  return {
    artifact,
    fields: [
      indexField("title", artifact.title),
      ...artifact.tags.map((tag) => indexField("tag", tag)),
      indexField("text", markdown),
    ],
  };
}

function matchesOfTerm(entry: IndexEntry, term: string): FieldMatch[] {
  return entry.fields.flatMap((indexed) => {
    const token = indexed.tokens.find((candidate) => candidate.folded.startsWith(term));
    return token ? [{ indexed, token }] : [];
  });
}

function toSnippet({ indexed, token }: FieldMatch): SearchSnippet {
  const clean = (part: string) => part.replace(WHITESPACE, " ");
  return {
    field: indexed.field,
    before: clean(indexed.text.slice(Math.max(0, token.start - SNIPPET_CONTEXT_CHARS), token.start)),
    hit: indexed.text.slice(token.start, token.end),
    after: clean(indexed.text.slice(token.end, token.end + SNIPPET_CONTEXT_CHARS)),
  };
}

function scoreEntry(entry: IndexEntry, terms: string[]): SearchHit | null {
  let score = 0;
  const matches = new Map<IndexedField, FieldMatch>();
  for (const term of terms) {
    const found = matchesOfTerm(entry, term);
    if (found.length === 0) return null;
    for (const field of new Set(found.map((match) => match.indexed.field))) score += FIELD_WEIGHT[field];
    for (const match of found) if (!matches.has(match.indexed)) matches.set(match.indexed, match);
  }
  const snippets = [...matches.values()]
    .sort((a, b) => FIELD_WEIGHT[b.indexed.field] - FIELD_WEIGHT[a.indexed.field])
    .slice(0, MAX_SNIPPETS_PER_HIT)
    .map(toSnippet);
  return { artifact: entry.artifact, score, snippets };
}

export function createSearchIndex(load: () => Promise<ArtifactWithContent[]>) {
  let entries: Promise<IndexEntry[]> | null = null;
  return {
    invalidate(): void {
      entries = null;
    },
    async search(query: string, limit = DEFAULT_SEARCH_LIMIT): Promise<SearchHit[]> {
      const terms = tokenize(query).map((token) => token.folded);
      if (terms.length === 0) return [];
      entries ??= load().then((artifacts) => artifacts.map(buildEntry));
      return (await entries)
        .map((entry) => scoreEntry(entry, terms))
        .filter((hit): hit is SearchHit => hit !== null)
        .sort((a, b) => b.score - a.score || b.artifact.updatedAt - a.artifact.updatedAt)
        .slice(0, limit);
    },
  };
}

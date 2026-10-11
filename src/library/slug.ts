const MAX_SLUG_CHARS = 80;
const FALLBACK_SLUG = "artifact";
const COMBINING_MARKS = /\p{M}/gu;
const NON_FILENAME_CHARS = /[^a-z0-9]+/g;
const EDGE_DASHES = /^-+|-+$/g;

export function slugify(title: string): string {
  const slug = title
    .normalize("NFD")
    .replace(COMBINING_MARKS, "")
    .toLowerCase()
    .replace(NON_FILENAME_CHARS, "-")
    .slice(0, MAX_SLUG_CHARS)
    .replace(EDGE_DASHES, "");
  return slug || FALLBACK_SLUG;
}

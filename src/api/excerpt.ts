interface Span {
  start: number;
  end: number;
}

export const MARKER_MAX_CHARS = 40;
const HEAD_SHARE = 0.3;
const TAIL_SHARE = 0.2;
const MIN_TERM_LENGTH = 3;
const PARAGRAPH_SEPARATOR = /\n{2,}/g;
const NON_WORD = /[^\p{L}\p{N}]+/u;
const COMBINING_MARKS = /\p{M}/gu;

const STOPWORDS = new Set(
  (
    "les des une est que qui dans pour par sur avec pas plus mais sont ete cette ces son ses aux comment quoi quel " +
    "quelle quels quelles nous vous ils elles elle the and for are was were what which who how why when where this " +
    "that these those with from into about have has had not but can does did you your"
  ).split(" "),
);

export const omissionMarker = (omitted: number): string => `\n\n[... ${omitted} car. omis ...]\n\n`;

const fold = (text: string): string => text.normalize("NFD").replace(COMBINING_MARKS, "").toLowerCase();

export function questionTerms(question: string): string[] {
  const words = fold(question).split(NON_WORD);
  return [...new Set(words.filter((word) => word.length >= MIN_TERM_LENGTH && !STOPWORDS.has(word)))];
}

function paragraphSpans(text: string, from: number, to: number): Span[] {
  const spans: Span[] = [];
  let start = from;
  for (const separator of text.slice(from, to).matchAll(PARAGRAPH_SEPARATOR)) {
    spans.push({ start, end: from + separator.index });
    start = from + separator.index + separator[0].length;
  }
  spans.push({ start, end: to });
  return spans.filter((span) => span.end > span.start);
}

function matchingSections(text: string, terms: string[], from: number, to: number, budget: number): Span[] {
  const scored = paragraphSpans(text, from, to)
    .map((span) => {
      const folded = fold(text.slice(span.start, span.end));
      return { span, score: terms.filter((term) => folded.includes(term)).length };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || a.span.start - b.span.start);
  const picked: Span[] = [];
  let remaining = budget;
  for (const { span } of scored) {
    const cost = span.end - span.start + MARKER_MAX_CHARS;
    if (cost > remaining) continue;
    picked.push(span);
    remaining -= cost;
  }
  return picked.sort((a, b) => a.start - b.start);
}

function joinSpans(text: string, spans: Span[]): string {
  let joined = "";
  let cursor = 0;
  for (const span of spans) {
    if (span.start > cursor) joined += omissionMarker(span.start - cursor);
    joined += text.slice(span.start, span.end);
    cursor = span.end;
  }
  return joined;
}

export function excerpt(text: string, terms: string[], limit: number): string {
  if (text.length <= limit) return text;
  const usable = limit - MARKER_MAX_CHARS;
  if (usable <= 0) return "";
  const headEnd = Math.floor(usable * HEAD_SHARE);
  const tailStart = text.length - Math.floor(usable * TAIL_SHARE);
  const middleBudget = usable - headEnd - (text.length - tailStart);
  const middle = matchingSections(text, terms, headEnd, tailStart, middleBudget);
  return joinSpans(text, [{ start: 0, end: headEnd }, ...middle, { start: tailStart, end: text.length }]);
}

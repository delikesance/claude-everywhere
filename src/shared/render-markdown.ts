import DOMPurify from "dompurify";
import { Marked } from "marked";

const ALLOWED_TAGS = [
  "p", "br", "hr", "strong", "em", "del", "code", "pre", "blockquote",
  "ul", "ol", "li", "h1", "h2", "h3", "h4", "h5", "h6", "a",
  "table", "thead", "tbody", "tr", "th", "td",
];
const SAFE_URI = /^(?:https?|mailto):/i;

const escapeHtml = (text: string): string =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const marked = new Marked({
  async: false,
  gfm: true,
  renderer: {
    html: ({ text }) => escapeHtml(text),
    image: ({ href, text }) => `<a href="${escapeHtml(href)}">${escapeHtml(text || href)}</a>`,
  },
});

DOMPurify.addHook("afterSanitizeAttributes", (node) => {
  if (node.tagName !== "A") return;
  node.setAttribute("rel", "noopener noreferrer");
  node.setAttribute("target", "_blank");
});

export function renderSafeMarkdown(markdown: string): DocumentFragment {
  const html = marked.parse(markdown) as string;
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR: ["href", "title"],
    ALLOWED_URI_REGEXP: SAFE_URI,
    ALLOW_DATA_ATTR: false,
    ALLOW_ARIA_ATTR: false,
    RETURN_DOM_FRAGMENT: true,
  });
}

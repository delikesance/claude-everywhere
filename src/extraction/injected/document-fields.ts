export function documentFields(doc: Document) {
  const url = doc.location.href;
  return { url, title: doc.title.trim() || url, lang: doc.documentElement.lang || null };
}

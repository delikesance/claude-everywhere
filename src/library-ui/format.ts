export function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString(document.documentElement.lang || undefined, { day: "numeric", month: "long" });
}

export function hostOf(url: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

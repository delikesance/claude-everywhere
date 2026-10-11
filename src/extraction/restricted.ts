import { INJECTABLE_PROTOCOLS, RESTRICTED_HOSTS } from "./constants";

export function isRestrictedUrl(url: string): boolean {
  if (!URL.canParse(url)) return true;
  const { protocol, hostname } = new URL(url);
  return !INJECTABLE_PROTOCOLS.includes(protocol) || RESTRICTED_HOSTS.has(hostname);
}

export function isPdfUrl(url: string): boolean {
  return URL.canParse(url) && new URL(url).pathname.toLowerCase().endsWith(".pdf");
}
